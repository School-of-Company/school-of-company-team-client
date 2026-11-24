type Box = {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
};
type Size = { readonly width: number; readonly height: number };

const GAP = 4;
const EDGE = 8;

/**
 * 버튼에 붙는 메뉴 자리(fixed 좌표). 기본은 버튼 아래, 오른쪽 끝 맞춤.
 * 아래가 모자라면 위로 뒤집고, 좌우는 화면 안으로 밀어 넣는다.
 */
export function menuPosition(anchor: Box, menu: Size, viewport: Size) {
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - menu.height;
  const top =
    below + menu.height <= viewport.height - EDGE || above < EDGE
      ? Math.max(EDGE, Math.min(below, viewport.height - EDGE - menu.height))
      : above;
  const left = Math.max(
    EDGE,
    Math.min(anchor.right - menu.width, viewport.width - EDGE - menu.width),
  );
  return { top, left };
}
