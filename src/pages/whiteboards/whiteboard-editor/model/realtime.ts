import type {
  WhiteboardClientMessage,
  WhiteboardServerMessage,
} from "@/entities/whiteboard";

/**
 * live: 소켓으로 주고받는다. connecting: 처음 붙는 중. reconnecting: 끊겨 다시 붙는 중(그동안 폴링).
 * off: 실시간을 쓰지 않는다(폴링과 REST 저장으로 계속).
 */
export type RealtimeStatus = "connecting" | "live" | "reconnecting" | "off";

/**
 * 상태가 바뀐 이유. denied 는 처음부터 볼 권한이 없다(joined 전 4403), revoked 는 붙은 뒤 권한을 잃었다(4403).
 * idle 은 오래 쉬어 닫혔다(4408, 다시 움직이면 붙는다). too-large 는 보낸 프레임이 커서 닫혔다(1009, reconnecting 과 함께 온다).
 */
export type RealtimeOffReason =
  | "unavailable"
  | "denied"
  | "revoked"
  | "full"
  | "idle"
  | "closed"
  | "too-large";

/** 브라우저 WebSocket 에서 쓰는 부분만(테스트는 흉내 낸 것을 넣는다). */
export type SocketLike = {
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  readonly readyState: number;
  send(data: string): void;
  close(code?: number): void;
};

type Timers = {
  readonly set: (run: () => void, ms: number) => unknown;
  readonly clear: (id: unknown) => void;
};

export type RealtimeDeps = {
  /** 티켓을 받아 소켓 주소를 돌려준다. 실패하면 status 가 있는 오류를 던진다. */
  readonly connectUrl: () => Promise<string>;
  readonly createSocket: (url: string) => SocketLike;
  readonly onMessage: (message: WhiteboardServerMessage) => void;
  readonly onStatus: (
    status: RealtimeStatus,
    reason?: RealtimeOffReason,
  ) => void;
  readonly timers?: Timers;
};

export const JOIN_TIMEOUT = 5_000;
export const MAX_BACKOFF = 30_000;
export const RATE_LIMIT_DELAY = 5_000;
/** 이만큼 붙어 있거나 saved 를 받아야 백오프를 처음부터 센다. 붙자마자 끊기는 고리(1009 등)가 1초마다 돌지 않게. */
export const STABLE_AFTER = 10_000;
const OPEN = 1;

/** 다시 붙지 않는 닫힘 코드(s19 3.3). */
const terminal: Readonly<Record<number, RealtimeOffReason>> = {
  1000: "closed",
  4409: "full",
  4408: "idle",
};

const statusOf = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status: unknown }).status)
    : 0;

/**
 * 화이트보드 방 하나의 연결 상태(s19 5절).
 * - 처음 붙기가 실패하면(티켓 실패, joined 전 닫힘, 5초 안에 joined 없음) off 로 두고 폴링에 맡긴다.
 * - 붙은 뒤 끊기면 reconnecting 으로 두고 새 티켓으로 1·2·4…30초 백오프 재접속한다. 4429 는 5초 뒤.
 * - 4403·4409·1000 은 다시 붙지 않는다. 4408 은 wake() 가 불리면(사용자가 다시 움직이면) 붙는다.
 */
export function createRealtimeConnection(deps: RealtimeDeps) {
  const timers: Timers = deps.timers ?? {
    set: (run, ms) => setTimeout(run, ms),
    clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  };
  let socket: SocketLike | null = null;
  let status: RealtimeStatus = "off";
  let everJoined = false;
  let stopped = true;
  let attempt = 0;
  let timer: unknown = null;
  let stableTimer: unknown = null;
  let idle = false;

  const setStatus = (next: RealtimeStatus, reason?: RealtimeOffReason) => {
    status = next;
    deps.onStatus(next, reason);
  };
  const clearTimer = () => {
    if (timer !== null) timers.clear(timer);
    timer = null;
  };
  const clearStable = () => {
    if (stableTimer !== null) timers.clear(stableTimer);
    stableTimer = null;
  };
  const off = (reason: RealtimeOffReason) => {
    clearTimer();
    idle = reason === "idle";
    setStatus("off", reason);
  };
  const retry = (delay?: number, reason?: RealtimeOffReason) => {
    setStatus("reconnecting", reason);
    const wait = delay ?? Math.min(1_000 * 2 ** attempt, MAX_BACKOFF);
    attempt += 1;
    timer = timers.set(() => {
      timer = null;
      void connect();
    }, wait);
  };
  /** joined 전 실패: 처음이면 폴링에 맡기고, 재접속 중이면 백오프를 이어 간다. */
  const failBeforeJoin = () => (everJoined ? retry() : off("unavailable"));

  async function connect() {
    if (stopped) return;
    if (!everJoined) setStatus("connecting");
    let url: string;
    try {
      url = await deps.connectUrl();
    } catch (error) {
      if (stopped) return;
      // 보드가 사라졌거나 못 읽는다. 폴링이 상태를 다시 본다.
      if ([401, 403, 404].includes(statusOf(error))) return off("unavailable");
      return failBeforeJoin();
    }
    if (stopped) return;
    const current = deps.createSocket(url);
    socket = current;
    let joined = false;
    timer = timers.set(() => {
      timer = null;
      if (joined || socket !== current) return;
      socket = null;
      current.onclose = null;
      current.close();
      failBeforeJoin();
    }, JOIN_TIMEOUT);
    current.onmessage = (event) => {
      let message: WhiteboardServerMessage;
      try {
        message = JSON.parse(String(event.data)) as WhiteboardServerMessage;
      } catch {
        return;
      }
      if (message.type === "joined" && !joined) {
        joined = true;
        everJoined = true;
        clearTimer();
        stableTimer = timers.set(() => {
          stableTimer = null;
          attempt = 0;
        }, STABLE_AFTER);
        setStatus("live");
      }
      deps.onMessage(message);
    };
    current.onclose = ({ code }) => {
      if (socket !== current) return;
      socket = null;
      clearTimer();
      clearStable();
      if (stopped) return;
      if (code === 4403) return off(joined ? "revoked" : "denied");
      const reason = terminal[code];
      if (reason && (joined || code !== 1000)) return off(reason);
      if (!joined) return failBeforeJoin();
      if (code === 1009) return retry(undefined, "too-large");
      return retry(code === 4429 ? RATE_LIMIT_DELAY : undefined);
    };
  }

  return {
    get status() {
      return status;
    },
    start() {
      if (!stopped) return;
      stopped = false;
      void connect();
    },
    stop() {
      stopped = true;
      clearTimer();
      clearStable();
      const current = socket;
      socket = null;
      if (current) {
        current.onclose = null;
        current.close(1000);
      }
    },
    /** 서버가 저장했다(saved). 연결이 건강하니 백오프를 처음부터 센다. */
    healthy() {
      if (status !== "live") return;
      clearStable();
      attempt = 0;
    },
    /** 4408 로 쉬던 연결을 다시 붙인다. 사용자가 움직일 때 부른다. */
    wake() {
      if (stopped || !idle || status !== "off") return;
      idle = false;
      everJoined = true;
      attempt = 0;
      setStatus("reconnecting");
      void connect();
    },
    /** live 일 때만 보낸다. 보냈으면 true. */
    send(message: WhiteboardClientMessage) {
      if (status !== "live" || !socket || socket.readyState !== OPEN)
        return false;
      socket.send(JSON.stringify(message));
      return true;
    },
  };
}

export type RealtimeConnection = ReturnType<typeof createRealtimeConnection>;
