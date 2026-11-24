/** 서버 SERVICE_KEY_PATTERN 과 같다. 소문자로 시작, 소문자·숫자·하이픈, 2~40자. */
export const SERVICE_KEY_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;

export type ServiceFormErrors = Partial<
  Record<"key" | "name" | "description" | "primaryOwnerId", string>
>;

export function validateServiceForm(values: {
  readonly key?: string;
  readonly name: string;
  readonly description: string;
  readonly primaryOwnerId?: string;
}): ServiceFormErrors {
  const errors: { -readonly [K in keyof ServiceFormErrors]: string } = {};
  if (values.key !== undefined && !SERVICE_KEY_PATTERN.test(values.key))
    errors.key =
      "소문자로 시작하고 소문자, 숫자, 하이픈만 쓴 2~40자로 입력하세요. 만든 뒤에는 바꿀 수 없습니다.";
  const name = values.name.trim();
  if (!name) errors.name = "이름을 입력하세요.";
  else if (name.length > 100) errors.name = "이름은 100자 이하로 입력하세요.";
  if (values.description.length > 2000)
    errors.description = "설명은 2000자 이하로 입력하세요.";
  if (values.primaryOwnerId !== undefined && !values.primaryOwnerId)
    errors.primaryOwnerId = "주 소유자를 고르세요.";
  return errors;
}

export function validateEnvironment(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "배포 환경 이름을 입력하세요.";
  if (trimmed.length > 100) return "배포 환경 이름은 100자 이하로 입력하세요.";
  return undefined;
}
