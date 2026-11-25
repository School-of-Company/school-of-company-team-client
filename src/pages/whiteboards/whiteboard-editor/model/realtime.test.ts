import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  JOIN_TIMEOUT,
  MAX_BACKOFF,
  RATE_LIMIT_DELAY,
  STABLE_AFTER,
  createRealtimeConnection,
  type RealtimeStatus,
  type SocketLike,
} from "./realtime";

class MockSocket implements SocketLike {
  onmessage: SocketLike["onmessage"] = null;
  onclose: SocketLike["onclose"] = null;
  readyState = 0;
  sent: string[] = [];
  closedWith: number | undefined | null = null;
  constructor(readonly url: string) {}
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
  }
  // 서버 쪽 동작
  receive(message: unknown) {
    this.readyState = 1;
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  drop(code: number) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const joined = {
  type: "joined",
  connectionId: "c-1",
  canEdit: true,
  version: 3,
  scene: { elements: [] },
  participants: [],
};

function setup(ticket: () => Promise<string> = async () => "ws://x/ws") {
  const sockets: MockSocket[] = [];
  const statuses: string[] = [];
  const messages: unknown[] = [];
  const pending: { run: () => void; ms: number; id: number }[] = [];
  let next = 0;
  const connection = createRealtimeConnection({
    connectUrl: ticket,
    createSocket: (url) => {
      const socket = new MockSocket(url);
      sockets.push(socket);
      return socket;
    },
    onMessage: (message) => messages.push(message),
    onStatus: (status: RealtimeStatus, reason) =>
      statuses.push(reason ? `${status}:${reason}` : status),
    timers: {
      set: (run, ms) => {
        const id = ++next;
        pending.push({ run, ms, id });
        return id;
      },
      clear: (id) => {
        const at = pending.findIndex((timer) => timer.id === id);
        if (at >= 0) pending.splice(at, 1);
      },
    },
  });
  /** 가장 먼저 걸린 타이머를 돌리고 그 지연을 돌려준다. */
  const fire = async () => {
    const timer = pending.shift();
    assert.ok(timer, "timer pending");
    timer.run();
    await flush();
    return timer.ms;
  };
  return { connection, sockets, statuses, messages, pending, fire };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("joins, goes live and sends only while live", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  assert.deepEqual(t.statuses, ["connecting"]);
  assert.equal(t.sockets[0].url, "ws://x/ws");
  assert.equal(t.connection.send({ type: "ping" }), false);
  t.sockets[0].receive(joined);
  assert.equal(t.connection.status, "live");
  assert.deepEqual(t.messages, [joined]);
  assert.deepEqual(
    t.pending.map((timer) => timer.ms),
    [STABLE_AFTER],
    "join timeout cleared, only the stability timer is left",
  );
  assert.equal(t.connection.send({ type: "ping" }), true);
  assert.deepEqual(t.sockets[0].sent, ['{"type":"ping"}']);
});

test("ticket failure on first connect falls back to polling", async () => {
  const t = setup(async () => {
    throw Object.assign(new Error("down"), { status: 502 });
  });
  t.connection.start();
  await flush();
  assert.deepEqual(t.statuses, ["connecting", "off:unavailable"]);
  assert.equal(t.pending.length, 0, "no retry");
});

test("no joined within 5 seconds falls back to polling", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  assert.equal(await t.fire(), JOIN_TIMEOUT);
  assert.equal(t.sockets[0].closedWith, undefined);
  assert.equal(t.connection.status, "off");
  t.sockets[0].drop(1006); // 늦게 온 닫힘은 무시한다
  assert.equal(t.sockets.length, 1);
});

test("close before joined (proxy refused upgrade) falls back", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].drop(1006);
  assert.deepEqual(t.statuses, ["connecting", "off:unavailable"]);
});

test("drop after joined reconnects with a fresh ticket and backoff", async () => {
  let tickets = 0;
  const t = setup(async () => `ws://x/ws?ticket=${++tickets}`);
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(1006);
  assert.equal(t.connection.status, "reconnecting");
  assert.equal(await t.fire(), 1_000);
  assert.equal(t.sockets[1].url, "ws://x/ws?ticket=2");
  // 두 번째도 joined 전에 끊기면 백오프를 늘려 이어 간다.
  t.sockets[1].drop(1006);
  assert.equal(t.connection.status, "reconnecting");
  assert.equal(await t.fire(), 2_000);
  t.sockets[2].drop(1006);
  assert.equal(await t.fire(), 4_000);
  t.sockets[3].receive(joined);
  assert.equal(t.connection.status, "live");
  // 붙자마자 끊기면 백오프를 이어 간다(1009 → 재접속 → 다시 1009 가 1초마다 돌지 않게).
  t.sockets[3].drop(1001);
  assert.equal(await t.fire(), 8_000);
});

test("backoff resets once the socket stays up or a save lands", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(1006);
  await t.fire(); // 1s
  t.sockets[1].receive(joined);
  assert.equal(await t.fire(), STABLE_AFTER, "stability timer");
  t.sockets[1].drop(1006);
  assert.equal(await t.fire(), 1_000, "reset after staying up");
  t.sockets[2].receive(joined);
  t.sockets[2].drop(1006);
  assert.equal(await t.fire(), 2_000, "no reset when it drops early");
  t.sockets[3].receive(joined);
  t.connection.healthy(); // saved 를 받았다
  t.sockets[3].drop(1006);
  assert.equal(await t.fire(), 1_000, "reset after saved");
});

test("1009 reconnects and says the frame was too large", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(1009);
  assert.equal(t.statuses.at(-1), "reconnecting:too-large");
  assert.equal(await t.fire(), 1_000);
  assert.equal(t.sockets.length, 2);
});

test("4403 before joined means no access, not a permission change", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].drop(4403);
  assert.equal(t.statuses.at(-1), "off:denied");
  assert.equal(t.pending.length, 0);
});

test("backoff is capped at 30 seconds", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(4500);
  let last = 0;
  for (let i = 0; i < 8; i += 1) {
    last = await t.fire();
    t.sockets.at(-1)!.drop(1006);
  }
  assert.equal(last, MAX_BACKOFF);
});

test("4403 stops for good and says why", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(4403);
  assert.deepEqual(t.statuses.at(-1), "off:revoked");
  assert.equal(t.pending.length, 0);
});

test("4409 room full keeps polling without retry", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].drop(4409);
  assert.deepEqual(t.statuses.at(-1), "off:full");
  assert.equal(t.pending.length, 0);
});

test("4429 waits 5 seconds before reconnecting", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(4429);
  assert.equal(await t.fire(), RATE_LIMIT_DELAY);
  assert.equal(t.sockets.length, 2);
});

test("4408 idle waits until the user moves again", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(4408);
  assert.deepEqual(t.statuses.at(-1), "off:idle");
  assert.equal(t.pending.length, 0);
  t.connection.wake();
  await flush();
  assert.equal(t.connection.status, "reconnecting");
  t.sockets[1].receive(joined);
  assert.equal(t.connection.status, "live");
  t.connection.wake(); // live 일 때는 아무 일도 없다
  assert.equal(t.sockets.length, 2);
});

test("ticket 404 while reconnecting stops", async () => {
  let calls = 0;
  const t = setup(async () => {
    calls += 1;
    if (calls > 1) throw Object.assign(new Error("gone"), { status: 404 });
    return "ws://x/ws";
  });
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.sockets[0].drop(1006);
  await t.fire();
  assert.deepEqual(t.statuses.at(-1), "off:unavailable");
});

test("stop closes normally and ignores later events", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].receive(joined);
  t.connection.stop();
  assert.equal(t.sockets[0].closedWith, 1000);
  t.sockets[0].drop(1006);
  assert.equal(t.pending.length, 0);
  assert.equal(t.connection.send({ type: "ping" }), false);
});

test("broken frames are ignored", async () => {
  const t = setup();
  t.connection.start();
  await flush();
  t.sockets[0].onmessage?.({ data: "{not json" });
  assert.deepEqual(t.messages, []);
});

test("ticket 429 backs off at least 5 seconds, even on the first connect", async () => {
  let calls = 0;
  const t = setup(async () => {
    calls += 1;
    if (calls <= 2) throw Object.assign(new Error("too many"), { status: 429 });
    return "ws://x/ws";
  });
  t.connection.start();
  await flush();
  assert.equal(t.connection.status, "reconnecting");
  assert.equal(t.sockets.length, 0, "no socket without a ticket");
  assert.equal(await t.fire(), RATE_LIMIT_DELAY);
  assert.equal(await t.fire(), RATE_LIMIT_DELAY);
  assert.equal(calls, 3, "one ticket per attempt");
  t.sockets[0].receive(joined);
  assert.equal(t.connection.status, "live");
});
