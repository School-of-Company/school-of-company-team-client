import assert from "node:assert/strict";
import { test } from "node:test";
import { requirementErrorMessage } from "./errors";
import { ApiError } from "@/shared/api";
import {
  buildSubmission,
  emptyDraft,
  serverFieldErrors,
  validateIntake,
  type IntakeDraft,
} from "./intake-form";
import {
  STATUS_TOKEN_HEADER,
  statusLink,
  statusTokenFromHash,
  statusTokenFromInput,
  statusTokenHeaders,
} from "./status-token";
import type { PublicForm } from "./types";

// 서버 IntakeTemplate(templateVersion=1)과 같은 항목.
const form: PublicForm = {
  title: "외주 문의",
  description: null,
  templateVersion: 1,
  template: [
    {
      key: "title",
      label: "요구사항 제목",
      type: "TEXT",
      required: true,
      help: null,
      maxLength: 200,
      maxItems: null,
    },
    {
      key: "background",
      label: "배경·문제",
      type: "LONG_TEXT",
      required: true,
      help: null,
      maxLength: 5000,
      maxItems: null,
    },
    {
      key: "features",
      label: "기능 목록",
      type: "LIST",
      required: true,
      help: null,
      maxLength: 500,
      maxItems: 30,
    },
    {
      key: "outOfScope",
      label: "하지 않을 것",
      type: "LONG_TEXT",
      required: false,
      help: null,
      maxLength: 2000,
      maxItems: null,
    },
    {
      key: "priority",
      label: "우선순위",
      type: "SELECT",
      required: true,
      help: null,
      maxLength: null,
      maxItems: null,
    },
    {
      key: "desiredDate",
      label: "희망 일정",
      type: "DATE",
      required: false,
      help: null,
      maxLength: null,
      maxItems: null,
    },
    {
      key: "references",
      label: "참고 자료",
      type: "URL_LIST",
      required: false,
      help: null,
      maxLength: 2000,
      maxItems: 10,
    },
  ],
  priorities: [
    { value: "URGENT", label: "긴급" },
    { value: "NORMAL", label: "보통" },
  ],
  consentText: "초안",
  consentReviewRequired: true,
  issuedAt: 1_700_000_000_000,
  issuedSig: "sig",
};

const filled = (): IntakeDraft => ({
  values: {
    title: " 로그인 개선 ",
    background: "느리다",
    features: ["소셜 로그인", "  ", "자동\n로그인"],
    outOfScope: "",
    priority: "NORMAL",
    desiredDate: "",
    references: ["https://figma.com/file/1", ""],
  },
  requester: {
    name: "홍길동",
    organization: "회사",
    email: "a@b.co",
    phone: "",
  },
  consent: true,
  website: "",
});

test("빈 양식은 필수 항목·요청자·동의를 서버와 같은 경로로 막는다", () => {
  const errors = validateIntake(form, emptyDraft(form));
  for (const path of [
    "sections.title",
    "sections.background",
    "sections.features",
    "priority",
    "requester.name",
    "requester.organization",
    "requester.email",
    "consent",
  ])
    assert.ok(errors[path], path);
  assert.equal(errors["sections.outOfScope"], undefined);
  assert.equal(errors["requester.phone"], undefined);
});

test("다 채운 양식은 통과하고, 길이·개수·형식은 상한에서 걸린다", () => {
  assert.deepEqual(validateIntake(form, filled()), {});
  const draft = filled();
  const errors = validateIntake(form, {
    ...draft,
    values: {
      ...draft.values,
      title: "가".repeat(201),
      features: Array.from({ length: 31 }, (_, i) => `기능 ${i}`),
      priority: "P0",
      desiredDate: "내일",
      references: ["ftp://x", "https://ok.example"],
    },
    requester: { ...draft.requester, email: "메일", phone: "1".repeat(31) },
  });
  assert.equal(errors["sections.title"], "200자 이하여야 합니다.");
  assert.equal(errors["sections.features"], "30개 이하여야 합니다.");
  assert.ok(errors.priority);
  assert.ok(errors.desiredDate);
  assert.ok(errors["references[0]"]);
  assert.equal(errors["references[1]"], undefined);
  assert.equal(errors["requester.email"], "이메일 형식이 아닙니다.");
  assert.equal(errors["requester.phone"], "30자 이하여야 합니다.");
});

test("제출 본문: 섹션·별도 필드를 나누고 빈 줄은 빼며 서명과 숨은 입력란을 그대로 보낸다", () => {
  const body = buildSubmission(form, { ...filled(), website: "bot" });
  assert.deepEqual(body.sections, {
    title: "로그인 개선",
    background: "느리다",
    features: ["소셜 로그인", "자동 로그인"],
  });
  assert.equal(body.priority, "NORMAL");
  assert.equal("desiredDate" in body, false);
  assert.deepEqual(body.references, ["https://figma.com/file/1"]);
  assert.deepEqual(body.requester, {
    name: "홍길동",
    organization: "회사",
    email: "a@b.co",
  });
  assert.equal(body.issuedAt, form.issuedAt);
  assert.equal(body.issuedSig, "sig");
  assert.equal(body.website, "bot");
  assert.equal(body.consent, true);
});

test("서버 VALIDATION_ERROR details 는 문자열 메시지만 남긴다", () => {
  assert.deepEqual(
    serverFieldErrors({ "sections.goal": "필수 항목입니다.", body: 3 }),
    {
      "sections.goal": "필수 항목입니다.",
    },
  );
  assert.deepEqual(serverFieldErrors(null), {});
  assert.deepEqual(serverFieldErrors(["x"]), {});
});

const token = "AbC-_0123456789abcdefghijklmnopqrstuvwxyzAB"; // 43자 base64url

test("상태 토큰은 fragment·붙여 넣은 링크·토큰만 모두 읽고, 형식이 아니면 버린다", () => {
  assert.equal(statusTokenFromHash(`#${token}`), token);
  assert.equal(statusTokenFromHash(""), null);
  assert.equal(statusTokenFromHash("#짧음"), null);
  assert.equal(statusTokenFromHash("#a b c d e f g h i j k l m n o p"), null);
  assert.equal(
    statusTokenFromInput(` https://hub.example/intake/status#${token} `),
    token,
  );
  assert.equal(statusTokenFromInput(token), token);
  assert.equal(
    statusTokenFromInput("https://hub.example/intake/status?token=x"),
    null,
  );
});

test("상태 링크는 토큰을 fragment 에만 두고 API 에는 헤더로 보낸다", () => {
  const link = statusLink("https://hub.example/", token);
  assert.equal(link, `https://hub.example/intake/status#${token}`);
  const url = new URL(link);
  assert.equal(url.search, "");
  assert.equal(url.pathname, "/intake/status");
  assert.deepEqual(statusTokenHeaders(token), { [STATUS_TOKEN_HEADER]: token });
  assert.equal(STATUS_TOKEN_HEADER, "X-Intake-Token");
});

test("공개 오류 문구: 404·410·429 는 안내 문구, 429 는 retryAfter 초를 알린다", () => {
  assert.match(
    requirementErrorMessage(new ApiError(404, "INTAKE_FORM_NOT_FOUND", "x")),
    /새 링크/,
  );
  assert.match(
    requirementErrorMessage(new ApiError(410, "INTAKE_FORM_CLOSED", "x")),
    /마감/,
  );
  assert.match(
    requirementErrorMessage(
      new ApiError(429, "TOO_MANY_REQUESTS", "x", { retryAfter: 42 }),
    ),
    /42초/,
  );
  assert.match(
    requirementErrorMessage(new ApiError(429, "INTAKE_DAILY_LIMIT", "x")),
    /내일/,
  );
  assert.equal(
    requirementErrorMessage(new ApiError(500, "NEW_CODE", "서버 문구")),
    "서버 문구",
  );
});
