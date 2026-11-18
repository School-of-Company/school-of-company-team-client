type Node = { contains: (other: never) => boolean };

/**
 * 경로가 바뀐 뒤 포커스를 본문으로 옮길지. 새 화면이 스스로 본문 안 요소에 포커스를 줬으면
 * (autoFocus 등) 그대로 두고, 이전 화면과 함께 사라져 body 에 있거나 사이드바·메뉴처럼 본문 밖이면 옮긴다.
 */
export function shouldFocusMain(active: unknown, main: Node, body: unknown) {
  if (!active || active === body || active === main) return true;
  return !main.contains(active as never);
}

/** 스크린리더에 알릴 새 화면 이름: 본문 첫 h1 글자. 없으면 null(아직 불러오는 중). */
export function headingAnnouncement(text: string | null | undefined) {
  const title = text?.replace(/\s+/g, " ").trim();
  return title ? `${title} 화면` : null;
}
