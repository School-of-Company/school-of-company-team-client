import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createSyncTracker, remoteWins } from "./sync";

const el = (
  id: string,
  version: number,
  versionNonce = 5,
  isDeleted = false,
) => ({
  id,
  version,
  versionNonce,
  isDeleted,
});

test("higher version wins, tie goes to the lower nonce, identical is ignored", () => {
  assert.equal(remoteWins(undefined, el("a", 1)), true);
  assert.equal(remoteWins(el("a", 2), el("a", 3)), true);
  assert.equal(remoteWins(el("a", 3), el("a", 2)), false);
  assert.equal(remoteWins(el("a", 3, 9), el("a", 3, 4)), true);
  assert.equal(remoteWins(el("a", 3, 4), el("a", 3, 9)), false);
  assert.equal(remoteWins(el("a", 3, 4), el("a", 3, 4)), false);
});

test("only elements the server has not seen are sent", () => {
  const sync = createSyncTracker();
  sync.reset([el("a", 1), el("b", 1)]);
  const scene = [el("a", 1), el("b", 2), el("c", 1)];
  assert.deepEqual(
    sync.delta(scene).map((element) => element.id),
    ["b", "c"],
  );
  sync.mark(sync.delta(scene));
  assert.deepEqual(sync.delta(scene), []);
});

test("received elements are not echoed back", () => {
  const sync = createSyncTracker();
  sync.reset([el("a", 1)]);
  const incoming = [el("a", 4, 2), el("new", 1)];
  sync.mark(incoming);
  assert.deepEqual(sync.delta(incoming), []);
});

test("a local edit that beats an incoming element is still sent", () => {
  const sync = createSyncTracker();
  sync.reset([el("a", 1)]);
  sync.mark([el("a", 2)]);
  // 받는 동안 내가 그리던 요소(version 3)가 화면에 남았다.
  assert.deepEqual(sync.delta([el("a", 3)]), [el("a", 3)]);
  // 같은 version 이라도 nonce 가 다르면 서버가 판정하게 보낸다.
  assert.deepEqual(sync.delta([el("a", 2, 1)]), [el("a", 2, 1)]);
});

test("deletes are sent as changes, unseen deleted elements are not", () => {
  const sync = createSyncTracker();
  sync.reset([el("a", 1)]);
  assert.deepEqual(sync.delta([el("a", 2, 5, true), el("tmp", 3, 5, true)]), [
    el("a", 2, 5, true),
  ]);
});

test("changes made while offline are found after rejoining", () => {
  const sync = createSyncTracker();
  sync.reset([el("a", 1)]);
  // 끊긴 동안 a 를 고치고 b 를 그렸다. 다시 붙으니 서버는 다른 사람이 고친 c 를 가지고 있다.
  sync.reset([el("a", 1), el("c", 2)]);
  assert.deepEqual(
    sync
      .delta([el("a", 2), el("b", 1), el("c", 2)])
      .map((element) => element.id),
    ["a", "b"],
  );
});
