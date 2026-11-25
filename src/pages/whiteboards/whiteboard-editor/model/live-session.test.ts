import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { WhiteboardClientMessage } from "@/entities/whiteboard";
import { createLiveSession, rejectsElements } from "./live-session";
import { remoteWins } from "./sync";

type El = {
  id: string;
  version: number;
  versionNonce: number;
  isDeleted?: boolean;
};
const el = (id: string, version: number, versionNonce = 5): El => ({
  id,
  version,
  versionNonce,
});

/** 캔버스 흉내: merge 는 reconcileElements 와 같은 규칙, editing 은 편집 중이라 지키는 요소. */
function setup(initial: El[] = []) {
  let scene = [...initial];
  let appState: Record<string, unknown> = { viewBackgroundColor: "#fff" };
  const sent: WhiteboardClientMessage[] = [];
  const editing = new Set<string>();
  let merges = 0;
  let canSend = true;
  const session = createLiveSession<El>({
    elements: () => scene,
    appState: () => appState,
    merge: (remote) => {
      merges += 1;
      const byId = new Map(scene.map((element) => [element.id, element]));
      for (const element of remote)
        if (
          !editing.has(element.id) &&
          remoteWins(byId.get(element.id), element)
        )
          byId.set(element.id, element);
      scene = [...byId.values()];
    },
    replace: (elements) => {
      scene = [...elements];
    },
    applyAppState: (shared) => {
      appState = { ...appState, ...shared };
    },
    send: (message) => {
      if (!canSend) return false;
      sent.push(message);
      return true;
    },
  });
  return {
    session,
    sent,
    editing,
    get scene() {
      return scene;
    },
    set scene(next: El[]) {
      scene = next;
    },
    setAppState: (next: Record<string, unknown>) => {
      appState = { ...appState, ...next };
    },
    merges: () => merges,
    readOnly: () => {
      canSend = false;
    },
  };
}

const sentIds = (message: WhiteboardClientMessage | undefined) =>
  message?.type === "elements"
    ? message.elements.map((element) => (element as El).id)
    : [];

test("joined merges the room and sends only my offline changes", () => {
  // 끊긴 동안 a 를 고치고 b 를 그렸다. 방에는 다른 사람이 그린 c 가 있다.
  const t = setup([el("a", 2), el("b", 1)]);
  t.session.joined([el("a", 1), el("c", 1)], { viewBackgroundColor: "#fff" });
  assert.deepEqual(
    t.scene.map((element) => element.id),
    ["a", "b", "c"],
  );
  assert.equal(t.sent.length, 1);
  assert.deepEqual(sentIds(t.sent[0]), ["a", "b"]);
  assert.equal(t.session.settled(), true);
  assert.equal(t.session.changed(), false);
});

test("joined with nothing new sends nothing", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  assert.deepEqual(t.sent, []);
  assert.equal(t.session.settled(), true);
});

test("incoming elements are applied and not echoed", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  t.session.incoming([el("a", 3), el("z", 1)], { viewBackgroundColor: "#000" });
  assert.deepEqual(t.scene, [el("a", 3), el("z", 1)]);
  assert.equal(t.session.changed(), false, "no echo of elements or appState");
  assert.equal(t.session.flush(), false);
  assert.equal(t.session.settled(), true);
});

test("an incoming element that loses does not touch the canvas", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  t.scene = [el("a", 4)]; // 내가 고쳤다
  t.session.incoming([el("a", 2)]);
  assert.equal(t.merges(), 1, "only the joined merge");
  assert.deepEqual(sentIds((t.session.flush(), t.sent.at(-1))), ["a"]);
});

test("my in-progress edit survives and is sent afterwards", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  t.editing.add("a");
  t.scene = [el("a", 2, 1)];
  t.session.incoming([el("a", 3)]);
  assert.deepEqual(t.scene, [el("a", 2, 1)], "edit kept");
  assert.equal(t.session.changed(), true);
  t.session.flush();
  assert.deepEqual(sentIds(t.sent.at(-1)), ["a"]);
});

test("a rejected batch is not resent and never counts as saved", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  t.scene = [el("a", 1), el("bad", 1)];
  t.session.flush();
  assert.equal(rejectsElements("WHITEBOARD_LINK_NOT_ALLOWED"), true);
  assert.equal(rejectsElements("WS_MESSAGE_INVALID"), false);
  assert.equal(t.session.reject(), 1);
  // saved 가 와도 화면에는 거부된 요소가 남아 있다(떠날 때 경고가 남아야 한다).
  assert.equal(t.session.settled(), false);
  assert.equal(t.session.changed(), false, "no resend loop");
  assert.equal(t.session.flush(), false);
  // 고치면(version 이 오르면) 새 변경이라 다시 보낸다.
  t.scene = [el("a", 1), el("bad", 2)];
  assert.equal(t.session.flush(), true);
  assert.deepEqual(sentIds(t.sent.at(-1)), ["bad"]);
  assert.equal(t.session.settled(), true);
});

test("after 1009 the same batch is not resent on rejoin; REST saving it settles", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  t.scene = [el("a", 1), el("huge", 1)];
  t.session.flush();
  assert.equal(t.session.reject(), 1, "1009 closed the socket");
  // REST 저장이 끝나기 전에 다시 붙었다: 같은 묶음을 되풀이해 보내지 않는다.
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  assert.equal(t.sent.length, 1);
  assert.equal(t.session.settled(), false);
  // REST 저장이 방에 병합된 뒤 다시 붙으면 방에 있다.
  t.session.joined([el("a", 1), el("huge", 1)], {
    viewBackgroundColor: "#fff",
  });
  assert.equal(t.session.settled(), true);
});

test("unmount: a flushed scene is settled so the REST save is skipped", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  t.scene = [el("a", 2)];
  assert.equal(t.session.settled(), false);
  t.session.flush();
  assert.equal(t.session.settled(), true);
});

test("read-only viewers receive but never mark anything as sent", () => {
  const t = setup([el("a", 1)]);
  t.readOnly();
  t.session.joined([el("a", 1), el("b", 1)], { viewBackgroundColor: "#fff" });
  assert.deepEqual(t.sent, []);
  assert.deepEqual(
    t.scene.map((element) => element.id),
    ["a", "b"],
  );
});

test("a local background change is sent once", () => {
  const t = setup([el("a", 1)]);
  t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" });
  t.setAppState({ viewBackgroundColor: "#eee", zoom: 2 });
  assert.equal(t.session.changed(), true);
  t.session.flush();
  assert.deepEqual(t.sent.at(-1), {
    type: "elements",
    elements: [],
    appState: { viewBackgroundColor: "#eee" },
  });
  assert.equal(t.session.changed(), false);
});

test("scene replaces instead of merging", () => {
  const t = setup([el("a", 9), el("b", 1)]);
  t.session.joined([el("a", 9), el("b", 1)], { viewBackgroundColor: "#fff" });
  t.session.replace([el("a", 10)], { viewBackgroundColor: "#fff" });
  assert.deepEqual(t.scene, [el("a", 10)]);
  assert.equal(t.session.settled(), true);
});

test("joined reports when rejected changes still need a REST save", () => {
  const t = setup([el("a", 1)]);
  assert.equal(
    t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" }),
    true,
  );
  t.scene = [el("a", 1), el("huge", 1)];
  t.session.flush();
  t.session.reject(); // 1009
  // 다시 붙었다. 방은 huge 를 모르니 REST 저장을 다시 걸어야 한다.
  assert.equal(
    t.session.joined([el("a", 1)], { viewBackgroundColor: "#fff" }),
    false,
  );
  // REST 저장이 방에 병합된 뒤라면 더 할 일이 없다.
  assert.equal(
    t.session.joined([el("a", 1), el("huge", 1)], {
      viewBackgroundColor: "#fff",
    }),
    true,
  );
});

test("a late error after two quick batches keeps both unsaved; saved confirms", () => {
  const t = setup([]);
  t.session.joined([], { viewBackgroundColor: "#fff" });
  t.scene = [el("bad", 1)];
  t.session.flush();
  t.scene = [el("bad", 1), el("next", 1)];
  t.session.flush();
  t.session.reject();
  assert.equal(t.session.settled(), false);
  t.scene = [el("ok", 1)];
  t.session.flush();
  t.session.confirm();
  t.session.reject(); // 확인된 뒤의 오류는 아무것도 탓하지 않는다
  assert.equal(t.session.settled(), true);
});
