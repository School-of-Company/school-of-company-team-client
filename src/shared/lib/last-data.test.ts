import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, AxiosHeaders } from "axios";
import { keepsLastData, LAST_DATA_LIMIT } from "./last-data";

const response = (status: number) => {
  const error = new AxiosError("failed");
  error.response = {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { code: "X", message: "x" },
  };
  return error;
};

test("일시 장애(네트워크·5xx)는 마지막 성공 후 60초 안에서만 목록을 유지한다", () => {
  const network = new AxiosError("network");
  assert.equal(keepsLastData(network, 0, LAST_DATA_LIMIT - 1), true);
  assert.equal(keepsLastData(response(503), 0, 30_000), true);
  assert.equal(keepsLastData(response(503), 0, LAST_DATA_LIMIT), false);
  assert.equal(keepsLastData(response(500), 1_000, 90_000), false);
});

test("401·403·404는 시간과 무관하게 바로 버린다", () => {
  for (const status of [401, 403, 404])
    assert.equal(keepsLastData(response(status), 0, 1), false, `${status}`);
});
