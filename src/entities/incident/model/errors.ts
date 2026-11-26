import { normalizeApiError } from "@/shared/api";

const messages: Readonly<Record<string, string>> = {
  INCIDENT_NOT_FOUND:
    "장애가 없어요. 삭제되었을 수 있으니 목록에서 다시 고르세요.",
  INCIDENT_FORBIDDEN:
    "장애 작성자, 대응 책임자, 영향 서비스 소유자, 헤드 어드민만 변경할 수 있어요.",
  INCIDENT_COMMANDER_NOT_ACTIVE:
    "대응 책임자는 활성 팀원만 맡을 수 있어요. 다른 사람을 고르세요.",
  INCIDENT_TIME_INVALID:
    "시각을 확인하세요. 미래 시각이나 시작보다 이른 상태 시각, 완화나 해결보다 늦은 시작 시각은 저장할 수 없어요.",
  TIMELINE_ENTRY_NOT_FOUND: "이미 지워진 메모예요. 새로고침해 확인하세요.",
  TIMELINE_ENTRY_NOT_DELETABLE:
    "상태, 심각도, 대응 책임자 기록은 지울 수 없어요. 메모만 지울 수 있어요.",
  POSTMORTEM_NOT_FOUND: "사후 검토가 아직 없어요.",
  POSTMORTEM_EXISTS: "사후 검토가 이미 있어요. 새로고침하면 열려요.",
  ACTION_ITEM_NOT_FOUND: "이미 지워진 조치 항목이에요. 새로고침해 확인하세요.",
  ACTION_ITEM_TASK_EXISTS: "이 조치 항목에는 이미 업무가 있어요.",
  PERSONAL_TASK_NOT_LINKABLE: "개인 업무는 장애에 연결할 수 없어요.",
  SERVICE_NOT_FOUND: "영향 서비스 중 없는 서비스가 있어요. 다시 고르세요.",
  SERVICE_ARCHIVED: "아카이브된 서비스는 새로 고를 수 없어요.",
  ACCESS_DENIED: "헤드 어드민 권한이 필요해요.",
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 완료한 뒤 이용해 주세요.",
  ASSIGNEE_NOT_ALLOWED:
    "담당자는 그 프로젝트 참여자(팀 공용은 활성 팀원)만 고를 수 있어요.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트에는 업무를 만들 수 없어요.",
  DISCORD_NOT_CONFIGURED:
    "Discord 연동이 설정되지 않았어요. 운영자에게 문의해 주세요.",
  DISCORD_CHANNEL_NOT_CONFIGURED:
    "팀 채널이 없어요. 관리자에게 팀 Discord 채널 연결을 요청해 주세요.",
  DISCORD_LINK_DISABLED:
    "팀 채널 연결이 비활성화됐어요. 관리자가 채널을 다시 연결해야 해요.",
  DISCORD_THREAD_CREATING:
    "스레드를 만드는 중이에요. 잠시 후 다시 눌러 주세요.",
  DISCORD_RESULT_UNKNOWN:
    "요청 결과를 확인 중이에요. 잠시 후 다시 눌러 주세요.",
  DISCORD_THREAD_NEEDS_CHECK:
    "스레드 확인이 필요해요. 헤드 어드민에게 복구를 요청해 주세요.",
  DISCORD_THREAD_DELETED:
    "스레드가 삭제됐어요. 헤드 어드민에게 복구를 요청해 주세요.",
  DISCORD_RECOVERY_NOT_NEEDED: "복구할 필요가 없는 스레드예요.",
  DISCORD_INVALID_RECOVERY_THREAD: "그 스레드 ID로는 복구할 수 없어요.",
  DISCORD_UNAVAILABLE: "Discord에 연결할 수 없어요. 잠시 후 다시 시도하세요.",
  DISCORD_REQUEST_FAILED: "Discord 요청이 실패했어요. 잠시 후 다시 시도하세요.",
};

export function incidentErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  return messages[problem.code] ?? problem.message;
}

export const isNotFound = (error: unknown, code?: string) => {
  const problem = normalizeApiError(error);
  return problem.status === 404 && (!code || problem.code === code);
};
