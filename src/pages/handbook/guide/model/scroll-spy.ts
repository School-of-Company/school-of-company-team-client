/** 본문 스크롤 위치(지금 값)로 목차에서 강조할 절을 고른다. */
export interface ScrollState {
  readonly scrollTop: number;
  readonly clientHeight: number;
  readonly scrollHeight: number;
}

/** 절 머리가 본문 위쪽 이 비율 안에 들어오면 그 절을 읽는 중으로 본다. */
const READ_LINE = 0.45;

/**
 * `sections`는 문서 순서이고 `top`은 스크롤 영역 맨 위 기준 위치다.
 * 맨 위면 첫 절, 맨 끝까지 내렸으면 마지막 절, 아니면 읽는 선을 넘은 마지막 절을 고른다.
 */
export function activeSection(
  sections: readonly { readonly id: string; readonly top: number }[],
  { scrollTop, clientHeight, scrollHeight }: ScrollState,
) {
  if (sections.length === 0) return undefined;
  if (scrollTop <= 0) return sections[0].id;
  if (scrollTop + clientHeight >= scrollHeight - 1) return sections.at(-1)!.id;
  const line = scrollTop + clientHeight * READ_LINE;
  let active = sections[0].id;
  for (const section of sections) if (section.top <= line) active = section.id;
  return active;
}
