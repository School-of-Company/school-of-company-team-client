/** Excalidraw 기본 단축키 중 자주 쓰는 것. Mac 은 Ctrl 대신 ⌘ 이다. */
export const shortcuts: readonly (readonly [keys: string, action: string])[] = [
  ["V 또는 1", "선택"],
  ["H", "손(화면 옮기기)"],
  ["R 또는 2", "사각형"],
  ["D 또는 3", "마름모"],
  ["O 또는 4", "원"],
  ["A 또는 5", "화살표"],
  ["L 또는 6", "선"],
  ["P 또는 7", "펜(자유 그리기)"],
  ["T 또는 8", "글자"],
  ["E 또는 0", "지우개"],
  ["Enter", "고른 도형에 글자 쓰기"],
  ["Ctrl + Z", "되돌리기"],
  ["Ctrl + Shift + Z", "다시 하기"],
  ["Ctrl + D", "복제"],
  ["Alt + 끌기", "복제하며 옮기기"],
  ["Ctrl + G", "묶기"],
  ["Ctrl + Shift + G", "묶음 풀기"],
  ["Delete", "지우기"],
  ["Ctrl + A", "모두 고르기"],
  ["Space + 끌기", "화면 옮기기"],
  ["Ctrl + 휠", "확대와 축소"],
  ["Shift + 1", "전체 보기"],
  ["Shift + 2", "고른 것 보기"],
];

/** 빈 보드 안내에 보이는 기본 단축키. */
export const basicShortcuts = shortcuts.filter(([keys]) =>
  ["R 또는 2", "A 또는 5", "T 또는 8", "Ctrl + Z"].includes(keys),
);

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

const startGuideKey = (userId: string) =>
  `whiteboard:start-guide-dismissed:${userId}`;

/** 저장소를 못 읽으면(사생활 보호 모드 등) 안내를 다시 띄우지 않는 쪽으로 둔다. */
export function startGuideDismissed(
  userId: string,
  storage?: Storage,
): boolean {
  try {
    // localStorage 를 읽는 것만으로 던지는 브라우저가 있다(SecurityError).
    return (
      (storage ?? globalThis.localStorage)?.getItem(startGuideKey(userId)) ===
      "1"
    );
  } catch {
    return true;
  }
}

export function dismissStartGuide(userId: string, storage?: Storage): void {
  try {
    (storage ?? globalThis.localStorage)?.setItem(startGuideKey(userId), "1");
  } catch {
    // 기억하지 못해도 이번 화면에서는 닫힌다.
  }
}
