export function validatePartName(name: string) {
  return !name.trim() || name.length > 50
    ? "파트 이름은 공백이 아닌 1~50자로 입력하세요."
    : null;
}
