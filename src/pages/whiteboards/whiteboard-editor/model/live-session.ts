import type { WhiteboardClientMessage } from "@/entities/whiteboard";
import { sharedAppState } from "./scene";
import { createSyncTracker, remoteWins, type Versioned } from "./sync";

type AppStateLike = Readonly<Record<string, unknown>>;

/** 캔버스(Excalidraw)에 닿는 부분. 테스트는 배열로 흉내 낸다. */
export type LivePort<E extends Versioned> = {
  /** 지운 요소까지 모두. */
  readonly elements: () => readonly E[];
  /** 지금 화면의 appState(공유하는 넷만 남긴다). */
  readonly appState: () => AppStateLike;
  /** 받은 요소를 합친다(reconcileElements: 내가 편집 중인 요소와 선택은 지킨다). */
  readonly merge: (remote: readonly E[]) => void;
  /** 통째로 바꾼다(복원). */
  readonly replace: (elements: readonly E[]) => void;
  readonly applyAppState: (shared: AppStateLike) => void;
  readonly send: (message: WhiteboardClientMessage) => boolean;
};

/** elements 메시지를 통째로 버리게 한 오류(s19 3.2). 이 밖의 오류는 보낸 묶음과 상관없다. */
const ELEMENT_ERRORS = new Set([
  "WHITEBOARD_READ_ONLY",
  "WHITEBOARD_SCENE_INVALID",
  "WHITEBOARD_FILES_NOT_ALLOWED",
  "WHITEBOARD_LINK_NOT_ALLOWED",
  "WHITEBOARD_TOO_LARGE",
]);

export const rejectsElements = (code: string) => ELEMENT_ERRORS.has(code);

const appStateKey = (appState: AppStateLike) =>
  JSON.stringify(sharedAppState(appState));

/**
 * 소켓으로 붙어 있는 동안 화면과 방(서버)을 맞춘다(s19 5절 3번).
 * 바뀐 요소만 보내고, 받은 요소는 되돌려 보내지 않고, 거부된 것은 되풀이하지 않는다.
 * settled() 가 참일 때만 화면이 서버와 같다(저장됨, 떠나도 잃지 않음).
 */
export function createLiveSession<E extends Versioned>(port: LivePort<E>) {
  const tracker = createSyncTracker();
  let sentAppState = "";

  const applyAppState = (appState: AppStateLike | undefined) => {
    if (!appState) return;
    const shared = sharedAppState(appState);
    sentAppState = appStateKey({ ...port.appState(), ...shared });
    port.applyAppState(shared);
  };

  const session = {
    /**
     * joined: 방의 scene 과 합치고, 끊긴 동안의 내 변경을 보낸다.
     * 소켓이 거부한 변경(1009 등)이 남아 있으면 false: REST 저장으로 보내야 한다.
     */
    joined(remote: readonly E[], appState?: AppStateLike) {
      port.merge(remote);
      tracker.reset(remote);
      applyAppState(appState);
      session.flush();
      return session.settled();
    },
    /** saved: 그때까지 보낸 것은 받아들여졌다. */
    confirm() {
      tracker.confirm();
    },
    /** 다른 사람(또는 REST 저장)의 변경. 이기는 요소가 없으면 화면을 건드리지 않는다. */
    incoming(remote: readonly E[], appState?: AppStateLike) {
      const local = new Map(
        port.elements().map((element) => [element.id, element]),
      );
      tracker.mark(remote);
      if (remote.some((element) => remoteWins(local.get(element.id), element)))
        port.merge(remote);
      applyAppState(appState);
    },
    /** scene: 병합하지 않고 바꾼다(D19-11). */
    replace(elements: readonly E[], appState?: AppStateLike) {
      port.replace(elements);
      tracker.reset(elements);
      applyAppState(appState);
    },
    /** 보낼 것이 있나(onChange 에서 디바운스를 걸지 정한다). */
    changed() {
      return (
        tracker.delta(port.elements()).length > 0 ||
        appStateKey(port.appState()) !== sentAppState
      );
    },
    /** 서버가 모르는 내 변경만 보낸다. 보냈으면 true. */
    flush() {
      const delta = tracker.delta(port.elements());
      const appState = sharedAppState(port.appState());
      const key = JSON.stringify(appState);
      const appStateChanged = key !== sentAppState;
      if (delta.length === 0 && !appStateChanged) return false;
      const sent = port.send({
        type: "elements",
        elements: delta,
        ...(appStateChanged ? { appState } : {}),
      });
      if (!sent) return false;
      tracker.sent(delta);
      sentAppState = key;
      return true;
    },
    /**
     * 마지막으로 보낸 묶음을 서버가 버렸다(elements 오류, 1009). 소켓으로 다시 보내지 않고,
     * 화면에 남아 있는 동안 settled 가 거짓이라 저장됨으로 바뀌지 않는다(REST 저장이 맡는다).
     */
    reject() {
      return tracker.reject();
    },
    /** 화면이 서버가 아는 것과 같다. */
    settled() {
      return !tracker.pending(port.elements());
    },
  };
  return session;
}

export type LiveSession<E extends Versioned> = ReturnType<
  typeof createLiveSession<E>
>;
