import assert from "node:assert/strict";
import { test } from "node:test";
import { linkInBatches, type LinkOutcome } from "./batch-link";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test("동시에 최대 3개까지만 연결한다", async () => {
  let inFlight = 0;
  let peak = 0;
  const started: number[] = [];
  await linkInBatches(
    [1, 2, 3, 4, 5, 6, 7],
    async (id) => {
      started.push(id);
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
    },
    () => {},
    String,
  );
  assert.equal(peak, 3);
  assert.deepEqual(started, [1, 2, 3, 4, 5, 6, 7]);
});

test("limit 1이면 하나씩 차례로 연결한다", async () => {
  const gates = [deferred(), deferred()];
  const started: number[] = [];
  const run = linkInBatches(
    [0, 1],
    (id) => {
      started.push(id);
      return gates[id].promise;
    },
    () => {},
    String,
    1,
  );
  await Promise.resolve();
  assert.deepEqual(started, [0]);
  gates[0].resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(started, [0, 1]);
  gates[1].resolve();
  assert.deepEqual(await run, []);
});

test("일부 실패해도 나머지를 연결하고 실패한 것만 입력 순서대로 돌려준다", async () => {
  const updates: [string, LinkOutcome][] = [];
  const failed = await linkInBatches(
    ["a", "b", "c", "d"],
    async (id) => {
      if (id === "b" || id === "d") throw new Error(`no-${id}`);
    },
    (id, outcome) => updates.push([id, outcome]),
    (error) => (error as Error).message,
  );
  assert.deepEqual(failed, ["b", "d"]);
  const last = new Map(updates);
  assert.deepEqual(last.get("a"), { status: "linked" });
  assert.deepEqual(last.get("b"), { status: "failed", reason: "no-b" });
  assert.deepEqual(last.get("c"), { status: "linked" });
  assert.deepEqual(last.get("d"), { status: "failed", reason: "no-d" });
  // 각 저장소는 진행 중을 먼저 알린 뒤 결과를 알린다.
  for (const id of ["a", "b", "c", "d"])
    assert.deepEqual(
      updates.filter(([key]) => key === id).map(([, o]) => o.status)[0],
      "linking",
    );
});

test("실패한 것만 다시 시도하면 성공한 저장소는 다시 요청하지 않는다", async () => {
  let flaky = true;
  const calls: string[] = [];
  const link = async (id: string) => {
    calls.push(id);
    if (id === "b" && flaky) throw new Error("down");
  };
  const failed = await linkInBatches(["a", "b", "c"], link, () => {}, String);
  assert.deepEqual(failed, ["b"]);
  flaky = false;
  calls.length = 0;
  assert.deepEqual(await linkInBatches(failed, link, () => {}, String), []);
  assert.deepEqual(calls, ["b"]);
});

test("빈 목록은 아무것도 요청하지 않는다", async () => {
  let called = false;
  const failed = await linkInBatches(
    [],
    async () => {
      called = true;
    },
    () => {},
    String,
  );
  assert.deepEqual(failed, []);
  assert.equal(called, false);
});
