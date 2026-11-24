import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DateTimePicker } from "./date-picker";

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

test("DateTimePicker splits the value into the date button and time field", () => {
  const html = render("2026-11-24T09:30");
  assert.ok(html.includes("2026년 11월 24일 (화)"));
  assert.match(html, /type="time"[^>]*value="09:30"/);
  assert.doesNotMatch(html, /type="(date|datetime-local)"/);
});

test("DateTimePicker limits the time only on the min date", () => {
  assert.match(render("2026-11-24T09:30", "2026-11-24T08:00"), /min="08:00"/);
  assert.doesNotMatch(
    render("2026-11-25T09:30", "2026-11-24T08:00"),
    /min="08:00"/,
  );
});

test("DateTimePicker shows the placeholder when empty", () => {
  assert.ok(render("").includes("날짜 선택"));
});
