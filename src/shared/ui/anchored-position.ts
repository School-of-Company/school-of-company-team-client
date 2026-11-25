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

/**
 * top layer(popover)나 position: fixed 로 뜬 패널을 trigger 옆에 붙이고, 스크롤과 창 크기 변화에 다시 맞춘다.
 * open 을 넘기면 그 값으로, 생략하면 패널의 네이티브 popover 열림(beforetoggle)을 따라간다.
 * 패널 CSS 는 position: fixed; inset: auto; margin: 0 이어야 한다.
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
    function place() {
      if (!element || !button) return;
      const { top, left } = anchoredPosition(
        button.getBoundingClientRect(),
        element.getBoundingClientRect(),
        { width: window.innerWidth, height: window.innerHeight },
        align,
      );
      element.style.top = `${top}px`;
      element.style.left = `${left}px`;
    }
    function start() {
      place();
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
    }
    function stop() {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    }
    if (open !== undefined) {
      if (!open) return;
      start();
      return stop;
    }
    // beforetoggle 은 패널이 보이기 직전에 온다. 다음 그리기 전(rAF)에 재어 붙이면 왼쪽 위에 번쩍이지 않는다.
    let frame = 0;
    function onToggle(event: Event) {
      cancelAnimationFrame(frame);
      if ((event as ToggleEvent).newState === "open")
        frame = requestAnimationFrame(start);
      else stop();
    }
    element.addEventListener("beforetoggle", onToggle);
    return () => {
      element.removeEventListener("beforetoggle", onToggle);
      cancelAnimationFrame(frame);
      stop();
    };
  }, [trigger, panel, open, align]);
}
