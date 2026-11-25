/** 지금 주소의 쿼리를 그대로 두고 일부만 바꾼다(null 은 지운다). 운영 탭과 서비스 상세 어디서든 같은 링크가 된다. */
export function withParams(
  pathname: string,
  search: URLSearchParams | null,
  next: Readonly<Record<string, string | null>>,
): string {
  const params = new URLSearchParams(search?.toString());
  for (const [key, value] of Object.entries(next))
    if (value === null) params.delete(key);
    else params.set(key, value);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
