// 기존 업무 연결: 업무 주소(`/tasks/{id}`, 보드의 `?task={id}`)나 ID 를 붙여 넣어도 ID 만 골라 낸다.
const ID = /^[0-9A-Za-z]{10,40}$/;

export function taskIdFromInput(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  try {
    const url = new URL(text, "http://local");
    const fromQuery = url.searchParams.get("task");
    if (fromQuery && ID.test(fromQuery)) return fromQuery;
    const match = /\/tasks\/([^/?#]+)/.exec(url.pathname);
    const id = match ? decodeURIComponent(match[1]) : "";
    return ID.test(id) ? id : null;
  } catch {
    return null;
  }
}
