import assert from "node:assert/strict";
import { test } from "node:test";
import { timelineEntryText, postmortemDisplaySections } from "./timeline";
import type { TimelineEntry } from "./types";

const author = { id: "u1", name: "김리드", username: "lead", avatarUrl: null };
const entries: readonly TimelineEntry[] = [
  {
    id: "1",
    kind: "CREATED",
    body: "사고 등록: SEV2, 커맨더 김리드",
    occurredAt: "2026-11-19T04:05:00Z",
    author,
    canDelete: false,
  },
  {
    id: "2",
    kind: "SEVERITY",
    body: "심각도 SEV2 → SEV1",
    occurredAt: "2026-11-19T04:06:00Z",
    author,
    canDelete: false,
  },
  {
    id: "3",
    kind: "COMMANDER",
    body: "커맨더 김리드 → SEV1 커맨더",
    occurredAt: "2026-11-19T04:07:00Z",
    author,
    canDelete: false,
  },
  {
    id: "4",
    kind: "STATUS",
    body: "상태 OPEN → MITIGATED: 사고 SEV2 커맨더 원문\n다음 줄",
    occurredAt: "2026-11-19T04:08:00Z",
    author,
    canDelete: false,
  },
  {
    id: "5",
    kind: "NOTE",
    body: "사고 등록: SEV2, 커맨더 김리드",
    occurredAt: "2026-11-19T04:09:00Z",
    author,
    canDelete: true,
  },
];

test("서버 생성 기록은 종류별로 표시하고 이름과 상태 메모 및 NOTE는 보존한다", () => {
  assert.deepEqual(entries.map(timelineEntryText), [
    "장애 등록: 높음, 대응 책임자 김리드",
    "심각도 높음 → 치명",
    "대응 책임자 김리드 → SEV1 커맨더",
    "상태 대응 중 → 완화됨: 사고 SEV2 커맨더 원문\n다음 줄",
    "사고 등록: SEV2, 커맨더 김리드",
  ]);
});

test("사후 검토에서 사람이 편집한 타임라인은 자동 기록과 비슷해도 바꾸지 않는다", () => {
  const timeline =
    "- 2026-11-19 13:05 [CREATED] 사고 등록: SEV2, 커맨더 김리드 (직접 수정) — 김리드\n직접 추가한 내용";
  assert.equal(
    postmortemDisplaySections(
      { summary: "", impact: "", rootCause: "", timeline },
      { title: "로그인 오류", timeline: entries },
    ).timeline,
    timeline,
  );
});

test("자동 초안의 여러 줄 NOTE 안에 있는 생성 기록 모양의 글은 바꾸지 않는다", () => {
  const body =
    "자료 [원문].*\n- 2026-11-19 13:06 [SEVERITY] 심각도 SEV2 → SEV1 — 김리드\n끝";
  const note: TimelineEntry = {
    id: "note",
    kind: "NOTE",
    body,
    occurredAt: "2026-11-19T04:10:00Z",
    author,
    canDelete: true,
  };
  const timeline = `- 2026-11-19 13:10 [NOTE] ${body} — 이전 이름`;
  assert.equal(
    postmortemDisplaySections(
      { summary: "", impact: "", rootCause: "", timeline },
      { title: "로그인 오류", timeline: [...entries, note] },
    ).timeline,
    `- 2026-11-19 13:10 [메모] ${body} — 이전 이름`,
  );
});

test("저장된 기록의 과거 값을 사용하고 알려지지 않은 형식은 보존한다", () => {
  assert.equal(
    timelineEntryText({
      kind: "CREATED",
      body: "사고 등록: SEV3, 커맨더 사고 커맨더 SEV2",
    }),
    "장애 등록: 보통, 대응 책임자 사고 커맨더 SEV2",
  );
  assert.equal(
    timelineEntryText({ kind: "STATUS", body: "상태 RESOLVED → OPEN" }),
    "상태 해결됨 → 대응 중",
  );
  assert.equal(
    timelineEntryText({ kind: "SEVERITY", body: "심각도 SEV4 → SEV1" }),
    "심각도 SEV4 → SEV1",
  );
});

test("사후 검토의 실제 자동 초안만 변환하며 NOTE와 수정된 본문은 보존한다", () => {
  const timeline = [
    "- 2026-11-19 13:05 [CREATED] 사고 등록: SEV2, 커맨더 김리드 — 김리드",
    "- 2026-11-19 13:06 [SEVERITY] 심각도 SEV2 → SEV1 — 김리드",
    "- 2026-11-19 13:07 [COMMANDER] 커맨더 김리드 → SEV1 커맨더 — 김리드",
    "- 2026-11-19 13:08 [STATUS] 상태 OPEN → MITIGATED: 사고 SEV2 커맨더 원문\n다음 줄 — 김리드",
    "- 2026-11-19 13:09 [NOTE] 사고 등록: SEV2, 커맨더 김리드 — 김리드",
  ].join("\n");
  const result = postmortemDisplaySections(
    {
      summary:
        "로그인 오류. 심각도 SEV2. 2026-11-19 13:05 시작.\n\n사고 SEV2 원문",
      timeline,
      impact: "SEV1 커맨더",
      rootCause: "사고 조사 중",
    },
    { title: "로그인 오류", timeline: entries },
  );
  assert.deepEqual(result, {
    summary:
      "로그인 오류. 심각도 높음. 2026-11-19 13:05 시작.\n\n사고 SEV2 원문",
    timeline: [
      "- 2026-11-19 13:05 [등록] 장애 등록: 높음, 대응 책임자 김리드 — 김리드",
      "- 2026-11-19 13:06 [심각도] 심각도 높음 → 치명 — 김리드",
      "- 2026-11-19 13:07 [대응 책임자] 대응 책임자 김리드 → SEV1 커맨더 — 김리드",
      "- 2026-11-19 13:08 [상태] 상태 대응 중 → 완화됨: 사고 SEV2 커맨더 원문\n다음 줄 — 김리드",
      "- 2026-11-19 13:09 [메모] 사고 등록: SEV2, 커맨더 김리드 — 김리드",
    ].join("\n"),
    impact: "SEV1 커맨더",
    rootCause: "사고 조사 중",
  });
  assert.equal(
    postmortemDisplaySections(
      {
        summary: "직접 쓴 심각도 SEV2",
        timeline: "수정한 기록",
        impact: "",
        rootCause: "",
      },
      { title: "로그인 오류", timeline: entries },
    ).summary,
    "직접 쓴 심각도 SEV2",
  );
});
