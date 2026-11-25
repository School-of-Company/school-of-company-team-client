"use client";

import { useLayoutEffect, type RefObject } from "react";

type Box = {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
};
type Size = { readonly width: number; readonly height: number };
export type AnchorAlign = "start" | "end";

const GAP = 4;
const EDGE = 8;

/**
 * 버튼에 붙는 패널 자리(fixed 좌표). 기본은 버튼 아래, align 에 따라 왼쪽(start) 또는 오른쪽(end) 끝 맞춤.
 * 아래가 모자라면 위로 뒤집고, 좌우는 화면 안으로 밀어 넣는다.
 */
export function anchoredPosition(
  anchor: Box,
  panel: Size,
  viewport: Size,
  align: AnchorAlign = "end",
) {
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - panel.height;
  const top =
    below + panel.height <= viewport.height - EDGE || above < EDGE
      ? Math.max(EDGE, Math.min(below, viewport.height - EDGE - panel.height))
      : above;
  const preferred =
    align === "start" ? anchor.left : anchor.right - panel.width;
  const left = Math.max(
    EDGE,
    Math.min(preferred, viewport.width - EDGE - panel.width),
  );
  return { top, left };
}

/** 트리거가 화면 밖으로 완전히 나갔는지. 이때 패널을 화면 가장자리에 붙여 두지 않고 닫거나 숨긴다. */
export function isOutOfView(anchor: Box, viewport: Size) {
  return (
    anchor.bottom <= 0 ||
    anchor.top >= viewport.height ||
    anchor.right <= 0 ||
    anchor.left >= viewport.width
  );
}

/**
 * top layer(popover)나 position: fixed 로 뜬 패널을 trigger 옆에 붙이고, 스크롤과 창 크기 변화에 다시 맞춘다.
 * open 을 넘기면 그 값으로, 생략하면 패널의 네이티브 popover 열림(beforetoggle)을 따라간다.
 * 패널 CSS 는 position: fixed; inset: auto; margin: 0 이어야 한다.
 * 네이티브 popover 는 보이기 전에 재므로 [data-anchor-measure] 일 때도 열린 때와 같은 display 를 준다.
 */
export function useAnchoredPosition(
  trigger: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  { open, align = "end" }: { open?: boolean; align?: AnchorAlign } = {},
) {
  useLayoutEffect(() => {
    const element = panel.current;
    const button = trigger.current;
    if (!element || !button) return;
    const native = open === undefined;
    // 크기는 레이아웃 크기(offset*)로 잰다. 등장 애니메이션의 scale 에 줄어든 값을 쓰지 않는다.
    function place() {
      if (!element || !button) return;
      const anchor = button.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      if (isOutOfView(anchor, viewport)) {
        if (native) element.hidePopover();
        else element.style.setProperty("visibility", "hidden");
        return;
      }
      const { top, left } = anchoredPosition(
        anchor,
        { width: element.offsetWidth, height: element.offsetHeight },
        viewport,
        align,
      );
      element.style.setProperty("top", `${top}px`);
      element.style.setProperty("left", `${left}px`);
      element.style.removeProperty("visibility");
    }
    // 스크롤과 창 크기 변화만 프레임당 한 번으로 묶는다. 처음 자리는 보이기 전에 동기로 정한다.
    let frame = 0;
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    }
    function start() {
      window.addEventListener("resize", schedule);
      window.addEventListener("scroll", schedule, true);
    }
    function stop() {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    }
    if (!native) {
      if (!open) return;
      place();
      start();
      return stop;
    }
    // beforetoggle 은 패널이 보이기 직전에 동기로 온다. 잠깐 측정용 display 를 주고 재어 자리를 정하면
    // 첫 프레임부터 버튼 옆에 그려진다.
    function onBeforeToggle(event: Event) {
      if (!element) return;
      if ((event as ToggleEvent).newState !== "open") return stop();
      element.setAttribute("data-anchor-measure", "");
      place();
      element.removeAttribute("data-anchor-measure");
      start();
    }
    element.addEventListener("beforetoggle", onBeforeToggle);
    return () => {
      element.removeEventListener("beforetoggle", onBeforeToggle);
      stop();
    };
  }, [trigger, panel, open, align]);
}
