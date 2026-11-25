import { test } from "node:test";
import { strict as assert } from "node:assert";
import { realtimeSocketUrl } from "./whiteboard";

const path = "/ws/whiteboards/01J?ticket=abc";

test("socket URL swaps http(s) for ws(s) on the API base", () => {
  assert.equal(
    realtimeSocketUrl(path, "https://api.example.com/", ""),
    "wss://api.example.com/ws/whiteboards/01J?ticket=abc",
  );
  assert.equal(
    realtimeSocketUrl(path, "http://localhost:8080", ""),
    "ws://localhost:8080/ws/whiteboards/01J?ticket=abc",
  );
});

test("a relative or missing API base uses the page origin", () => {
  assert.equal(
    realtimeSocketUrl(path, "", "https://team.example.com"),
    "wss://team.example.com/ws/whiteboards/01J?ticket=abc",
  );
});
