export function validateProjectForm(input: {
  readonly key?: string;
  readonly name: string;
}) {
  if (input.key !== undefined && !/^[A-Z][A-Z0-9]{1,9}$/.test(input.key)) {
    return "프로젝트 키는 대문자로 시작하는 대문자, 숫자 2~10자로 입력하세요.";
  }
  if (!input.name.trim() || input.name.length > 100) {
    return "프로젝트 이름은 공백이 아닌 1~100자로 입력하세요.";
  }
  return null;
}
