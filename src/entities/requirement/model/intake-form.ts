import type {
  PublicForm,
  RequesterPriority,
  SubmitRequirement,
  TemplateField,
} from "./types";

// 공개 제출 양식의 화면 상태와 검사. 서버(IntakeTemplate.parse)와 같은 규칙·같은 오류 경로(`sections.goal`)를 쓴다.
// 서버가 최종 판정이고 여기는 보내기 전 안내다.

export type IntakeDraft = {
  /** 템플릿 항목 키 → 값. 목록형(LIST·URL_LIST)은 줄 배열. */
  readonly values: Readonly<Record<string, string | readonly string[]>>;
  readonly requester: {
    readonly name: string;
    readonly organization: string;
    readonly email: string;
    readonly phone: string;
  };
  readonly consent: boolean;
  /** 숨은 입력란(봇 판정). 사람은 비워 둔다. */
  readonly website: string;
};

export type FieldErrors = Readonly<Record<string, string>>;

export const requesterFields = [
  { key: "name", label: "이름", max: 50, required: true, type: "text" },
  {
    key: "organization",
    label: "소속",
    max: 100,
    required: true,
    type: "text",
  },
  { key: "email", label: "이메일", max: 200, required: true, type: "email" },
  { key: "phone", label: "연락처", max: 30, required: false, type: "tel" },
] as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const isList = (field: TemplateField) =>
  field.type === "LIST" || field.type === "URL_LIST";

/** 요청 본문에서 그 항목이 들어가는 자리. 섹션이 아닌 항목은 요청의 별도 필드다. */
export function fieldPath(field: TemplateField): string {
  switch (field.type) {
    case "SELECT":
      return "priority";
    case "DATE":
      return "desiredDate";
    case "URL_LIST":
      return "references";
    default:
      return `sections.${field.key}`;
  }
}

export function emptyDraft(form: PublicForm): IntakeDraft {
  return {
    values: Object.fromEntries(
      form.template.map((field) => [field.key, isList(field) ? [""] : ""]),
    ),
    requester: { name: "", organization: "", email: "", phone: "" },
    consent: false,
    website: "",
  };
}

const items = (value: string | readonly string[] | undefined) =>
  (Array.isArray(value) ? value : [])
    .map((item) => item.replace(/[\r\n]+/g, " ").trim())
    .filter(Boolean);
const text = (value: string | readonly string[] | undefined) =>
  typeof value === "string" ? value.trim() : "";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname
    );
  } catch {
    return false;
  }
}

export function validateIntake(
  form: PublicForm,
  draft: IntakeDraft,
): FieldErrors {
  const errors: Record<string, string> = {};
  for (const field of form.template) {
    const path = fieldPath(field);
    const value = draft.values[field.key];
    if (field.type === "LIST") {
      const list = items(value);
      if (field.required && list.length === 0)
        errors[path] = "한 개 이상 적어 주세요.";
      else if (field.maxItems && list.length > field.maxItems)
        errors[path] = `${field.maxItems}개 이하여야 해요.`;
      else if (
        field.maxLength &&
        list.some((item) => item.length > field.maxLength!)
      )
        errors[path] = `항목은 ${field.maxLength}자 이하여야 해요.`;
    } else if (field.type === "URL_LIST") {
      const list = items(value);
      if (field.required && list.length === 0)
        errors[path] = "한 개 이상 적어 주세요.";
      else if (field.maxItems && list.length > field.maxItems)
        errors[path] = `${field.maxItems}개 이하여야 해요.`;
      list.forEach((url, index) => {
        if (
          (field.maxLength && url.length > field.maxLength) ||
          !isHttpUrl(url)
        )
          errors[`references[${index}]`] = "http(s) 주소여야 해요.";
      });
    } else {
      const body = text(value);
      if (!body) {
        if (field.required) errors[path] = "필수 항목이에요.";
      } else if (field.maxLength && body.length > field.maxLength)
        errors[path] = `${field.maxLength}자 이하여야 해요.`;
      else if (
        field.type === "SELECT" &&
        !form.priorities.some((p) => p.value === body)
      )
        errors[path] = "목록에서 고르세요.";
      else if (field.type === "DATE" && !/^\d{4}-\d{2}-\d{2}$/.test(body))
        errors[path] = "날짜 형식이 아니에요.";
    }
  }
  for (const field of requesterFields) {
    const value = draft.requester[field.key].trim();
    const path = `requester.${field.key}`;
    if (!value) {
      if (field.required) errors[path] = "필수 항목이에요.";
    } else if (value.length > field.max)
      errors[path] = `${field.max}자 이하여야 해요.`;
    else if (field.type === "email" && !EMAIL.test(value))
      errors[path] = "이메일 형식이 아니에요.";
  }
  if (!draft.consent)
    errors.consent = "개인정보 수집, 이용에 동의해야 제출할 수 있어요.";
  return errors;
}

/** 서버 요청 본문. 빈 선택 항목은 보내지 않고, 목록은 빈 줄을 뺀다(줄 순서가 업무 만들기의 featureIndex). */
export function buildSubmission(
  form: PublicForm,
  draft: IntakeDraft,
): SubmitRequirement {
  const sections: Record<string, string | readonly string[]> = {};
  let priority: RequesterPriority | null = null;
  let desiredDate: string | undefined;
  let references: readonly string[] = [];
  for (const field of form.template) {
    const value = draft.values[field.key];
    switch (field.type) {
      case "SELECT":
        priority = (text(value) || null) as RequesterPriority | null;
        break;
      case "DATE":
        desiredDate = text(value) || undefined;
        break;
      case "URL_LIST":
        references = items(value);
        break;
      case "LIST": {
        const list = items(value);
        if (list.length) sections[field.key] = list;
        break;
      }
      default: {
        const body = text(value);
        if (body) sections[field.key] = body;
      }
    }
  }
  const phone = draft.requester.phone.trim();
  return {
    sections,
    priority,
    ...(desiredDate ? { desiredDate } : {}),
    references,
    requester: {
      name: draft.requester.name.trim(),
      organization: draft.requester.organization.trim(),
      email: draft.requester.email.trim(),
      ...(phone ? { phone } : {}),
    },
    consent: draft.consent,
    issuedAt: form.issuedAt,
    issuedSig: form.issuedSig,
    website: draft.website,
  };
}

/** `VALIDATION_ERROR` 의 details(필드 경로 → 메시지)만 문자열로 골라 낸다. */
export function serverFieldErrors(details: unknown): FieldErrors {
  if (typeof details !== "object" || details === null || Array.isArray(details))
    return {};
  return Object.fromEntries(
    Object.entries(details).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
