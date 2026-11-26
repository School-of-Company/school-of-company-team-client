import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InfoTip } from "./info-tip";

test("i 버튼은 이름을 갖고 설명 패널을 열며, 낭독기는 같은 설명을 읽는다", () => {
  const html = renderToStaticMarkup(
    <InfoTip label="속도 설명">끝낸 크기 합계</InfoTip>,
  );
  const panelId = /<div id="([^"]+)" popover="auto"/.exec(html)?.[1];
  assert.ok(panelId);
  assert.match(html, /aria-label="속도 설명"/);
  assert.ok(
    html.includes(`popoverTarget="${panelId}"`) ||
      html.includes(`popovertarget="${panelId}"`),
  );
  assert.ok(html.includes(`aria-describedby="${panelId}"`));
  assert.match(html, /끝낸 크기 합계/);
});
