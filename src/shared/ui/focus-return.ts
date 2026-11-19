type Focusable = {
  readonly isConnected: boolean;
  focus: (options?: FocusOptions) => void;
};

/**
 * 대화상자가 닫힐 때(조건부 렌더로 언마운트될 때 포함) 포커스를 돌려준다.
 * 연 요소가 그대로 있고 포커스를 받을 수 있으면 그 요소, 사라졌거나 비활성이면 본문(`main`)으로 보낸다.
 * 키보드 사용자가 body 로 떨어져 처음부터 다시 탭하지 않게 하려는 것이다.
 */
export function restoreFocus(
  target: Focusable | null,
  doc: {
    readonly activeElement: unknown;
    querySelector: (selector: string) => Focusable | null;
  } = document as never,
) {
  for (const element of [target, doc.querySelector("main")]) {
    if (!element?.isConnected) continue;
    element.focus({ preventScroll: true });
    if (doc.activeElement === element) return element;
  }
  return null;
}
