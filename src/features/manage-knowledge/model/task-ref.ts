/** 업무 연결 입력: 업무 화면 주소(`/tasks/{id}`, 보드 `?task={id}`) 또는 ID 그대로. 업무를 고르는 전역 검색이 없어서다(검색은 8단계). */
export function parseTaskRef(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const fromPath = /\/tasks\/([0-9A-Za-z]{26})(?:[/?#]|$)/.exec(text);
  if (fromPath?.[1]) return fromPath[1].toUpperCase();
  const fromQuery = /[?&]task=([0-9A-Za-z]{26})(?:[&#]|$)/.exec(text);
  if (fromQuery?.[1]) return fromQuery[1].toUpperCase();
  return /^[0-9A-Za-z]{26}$/.test(text) ? text.toUpperCase() : null;
}
