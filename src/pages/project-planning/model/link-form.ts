import type { ProjectLink, UpdateProjectLink } from "./links";

export type LinkForm = {
  readonly url: string;
  readonly title: string;
  readonly label: string;
};

const blankToNull = (value: string) => value.trim() || null;

/** 서버 규칙(2.4절)을 미리 본다. 최종 판정은 서버(LINK_URL_INVALID·VALIDATION_ERROR). */
export function validateLinkForm(form: LinkForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const url = form.url.trim();
  if (!url) errors.url = "주소를 입력하세요.";
  else if (url.length > 2000) errors.url = "주소는 2000자까지 쓸 수 있어요.";
  else {
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      parsed = null;
    }
    if (
      !parsed ||
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    )
      errors.url =
        "http:// 또는 https://로 시작하는 주소를 넣으세요. 아이디, 비밀번호가 들어간 주소는 쓸 수 없어요.";
  }
  if (form.title.trim().length > 100)
    errors.title = "제목은 100자까지 쓸 수 있어요.";
  if (form.label.trim().length > 30)
    errors.label = "라벨은 30자까지 쓸 수 있어요.";
  return errors;
}

/** 수정은 바뀐 필드만 보낸다. 비운 제목·라벨은 null(비우기). 바뀐 게 없으면 빈 객체. */
export function linkPatch(
  link: ProjectLink,
  form: LinkForm,
): UpdateProjectLink {
  const url = form.url.trim();
  const title = blankToNull(form.title);
  const label = blankToNull(form.label);
  return {
    ...(url !== link.url && { url }),
    ...(title !== link.customTitle && { title }),
    ...(label !== link.label && { label }),
  };
}

/** 새 링크 본문. 비운 제목·라벨은 보내지 않는다. */
export function linkCreateBody(form: LinkForm) {
  return {
    url: form.url.trim(),
    ...(form.title.trim() && { title: form.title.trim() }),
    ...(form.label.trim() && { label: form.label.trim() }),
  };
}

/** `id`를 `index` 자리로 옮긴 전체 순서. 그대로면 null. */
export function moveLink(
  ids: readonly string[],
  id: string,
  index: number,
): string[] | null {
  const from = ids.indexOf(id);
  if (from < 0 || index < 0 || index >= ids.length || from === index)
    return null;
  const next = ids.filter((item) => item !== id);
  next.splice(index, 0, id);
  return next;
}
