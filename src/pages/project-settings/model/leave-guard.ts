/**
 * 저장하지 않은 변경이 있을 때 붙잡을 링크 클릭인지 고르고, 붙잡으면 이동할 주소를 돌려준다.
 * 새 탭(수식 키, target), 다운로드, 다른 출처, 같은 주소는 그대로 둔다.
 */
export function guardedHref(
  click: {
    readonly button: number;
    readonly metaKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
    readonly defaultPrevented: boolean;
  },
  anchor: {
    readonly href: string;
    readonly target: string;
    readonly download: boolean;
  },
  current: string,
): string | null {
  if (
    click.defaultPrevented ||
    click.button !== 0 ||
    click.metaKey ||
    click.ctrlKey ||
    click.shiftKey ||
    click.altKey ||
    anchor.download ||
    (anchor.target !== "" && anchor.target !== "_self")
  )
    return null;
  const here = new URL(current);
  const next = new URL(anchor.href, here);
  if (next.origin !== here.origin) return null;
  if (next.pathname === here.pathname && next.search === here.search)
    return null;
  return `${next.pathname}${next.search}${next.hash}`;
}
