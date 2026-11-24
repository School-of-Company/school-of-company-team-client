import { afterEach, beforeEach, test } from "node:test";
import { strict as assert } from "node:assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fromSeoulDateTime, toSeoulDateTime } from "@/shared/lib";
import { DateTimePicker } from "./date-picker";

// 서울이 아닌 브라우저(로스앤젤레스, UTC-8)에서도 서울 기준으로 보이고 보내는지 본다.
const previousTz = process.env.TZ;
beforeEach(() => {
  process.env.TZ = "America/Los_Angeles";
});
afterEach(() => {
  process.env.TZ = previousTz;
});

const render = (value: string, min?: string) =>
  renderToStaticMarkup(
    createElement(DateTimePicker, {
      id: "at",
      label: "변경 시각",
      value,
      min,
      onChange: () => {},
    }),
  );

test("non-KST browser: Seoul wall time converts both ways", () => {
  // 브라우저 지역 시각으로는 11월 23일 16:30 이지만 서울은 11월 24일 09:30 이다.
  assert.equal(new Date("2026-11-24T00:30:00Z").getDate(), 23);
  assert.equal(toSeoulDateTime("2026-11-24T00:30:00Z"), "2026-11-24T09:30");
  assert.equal(
    fromSeoulDateTime("2026-11-24", "09:30"),
    "2026-11-24T00:30:00.000Z",
  );
  assert.equal(toSeoulDateTime(""), "");
  assert.equal(toSeoulDateTime("nope"), "");
  assert.equal(fromSeoulDateTime("", "09:30"), "");
});

test("DateTimePicker shows the Seoul date and time of an ISO value", () => {
  const html = render("2026-11-24T00:30:00Z");
  assert.ok(html.includes("2026년 11월 24일 (화)"));
  assert.match(html, /type="time"[^>]*value="09:30"/);
  assert.doesNotMatch(html, /type="(date|datetime-local)"/);
});

test("DateTimePicker names its fields without repeating 시각", () => {
  const html = render("2026-11-24T00:30:00Z");
  assert.match(html, /aria-label="변경 시각"/);
  assert.match(html, /aria-label="변경 날짜 선택"|변경 날짜/);
  assert.doesNotMatch(html, /시각 시각/);
});

test("DateTimePicker limits the time only on the min date", () => {
  const min = "2026-11-23T23:00:00Z"; // 서울 11월 24일 08:00
  assert.match(render("2026-11-24T00:30:00Z", min), /min="08:00"/);
  assert.doesNotMatch(render("2026-11-25T00:30:00Z", min), /min="08:00"/);
});

test("DateTimePicker disables the time field until a date exists", () => {
  const html = render("");
  assert.ok(html.includes("날짜 선택"));
  assert.match(html, /type="time"[^>]*disabled=""/);
  assert.match(html, /type="time"[^>]*value=""/);
});
