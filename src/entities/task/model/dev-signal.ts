// 단계 2 개발 신호(서버 docs/spec/s2-dev-signals.md). merge는 표시·제안만 하고 상태는 사람이 바꾼다.
export type CiStatus = "SUCCESS" | "FAILURE" | "NEUTRAL" | "NONE";
export type ReviewSignal =
  "CHANGES_REQUESTED" | "REQUESTED" | "APPROVED" | "NONE";

export type DevSignal = {
  readonly ci: CiStatus;
  readonly review: ReviewSignal;
  readonly merged: boolean;
  readonly openPullRequests: number;
};

export const ciLabels: Readonly<Record<CiStatus, string>> = {
  SUCCESS: "CI 통과",
  FAILURE: "CI 실패",
  NEUTRAL: "CI 중립",
  NONE: "CI 결과 없음",
};

export const reviewLabels: Readonly<Record<ReviewSignal, string>> = {
  CHANGES_REQUESTED: "변경 요청",
  REQUESTED: "리뷰 대기",
  APPROVED: "승인",
  NONE: "리뷰 없음",
};

/** merge된 PR이 있는데 업무가 아직 완료가 아니면 "완료로 옮기기"를 제안한다(자동 이동 아님). */
export const suggestsDone = (merged: boolean, status: string) =>
  merged && status !== "DONE";
