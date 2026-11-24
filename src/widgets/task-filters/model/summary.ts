/** 적용된 필터 칩 글자: 둘까지는 이름을 다 쓰고, 셋부터는 "박하민 외 2명". */
export function summarize(labels: readonly string[], unit: string): string {
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]} 외 ${labels.length - 1}${unit}`;
}
