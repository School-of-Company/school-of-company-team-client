const messages: Readonly<Record<string, string>> = {
  PROJECT_NOT_FOUND:
    "프로젝트가 없거나 조회 권한이 없습니다. 프로젝트 목록으로 돌아가세요.",
  PROJECT_FORBIDDEN:
    "이 설정을 변경할 권한이 없습니다. 최신 권한을 확인해 주세요.",
  PROJECT_ARCHIVED:
    "아카이브된 프로젝트는 조회만 가능합니다. 복원한 뒤 다시 시도하세요.",
  ACCESS_DENIED: "헤드 어드민 권한이 필요합니다.",
  SUSPENDED: "이용이 중지된 계정입니다. 관리자에게 문의하세요.",
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 완료한 뒤 이용해 주세요.",
  CANNOT_REMOVE_PM:
    "PM은 먼저 교체하거나 해제한 뒤 참여자에서 제외할 수 있습니다.",
  LAST_HEAD_ADMIN:
    "마지막 활성 헤드 어드민은 해제하거나 이용 중지할 수 없습니다.",
  CANNOT_DEMOTE_SELF: "자신의 헤드 어드민 역할은 직접 해제할 수 없습니다.",
  CANNOT_SUSPEND_SELF: "자신의 계정은 직접 이용 중지할 수 없습니다.",
  DUPLICATE_PART_NAME: "같은 이름의 파트가 있습니다. 다른 이름을 입력하세요.",
  DUPLICATE_PLANNING_BUCKET_NAME:
    "같은 이름의 버킷이 있습니다(보관된 버킷 포함). 다른 이름을 입력하세요.",
  STALE_BUCKET_ORDER:
    "그 사이 버킷 목록이 바뀌었습니다. 최신 목록에서 다시 옮겨 주세요.",
  PLANNING_BUCKET_NOT_FOUND:
    "이미 삭제된 버킷입니다. 최신 목록을 다시 불러왔습니다.",
  ALREADY_PROJECT_MEMBER:
    "이미 프로젝트에 참여한 사용자입니다. 목록을 새로고침하세요.",
  NOT_PROJECT_MEMBER: "프로젝트 참여자 중에서 선택해 주세요.",
  USER_NOT_ACTIVE: "활성 사용자만 추가하거나 PM으로 지정할 수 있습니다.",
  GITHUB_REPOSITORY_IN_USE:
    "발행에 사용 중인 저장소는 연결을 해제할 수 없습니다.",
  GITHUB_REPOSITORY_NOT_INSTALLED:
    "GitHub App 설치에서 허용한 저장소만 연결할 수 있습니다.",
  GITHUB_NOT_CONFIGURED:
    "GitHub App이 설정되지 않았습니다. 운영자에게 문의하세요.",
  DISCORD_NOT_CONFIGURED:
    "Discord 봇이 설정되지 않았습니다. 운영자에게 문의하세요.",
  DISCORD_CHANNEL_NO_ACCESS:
    "봇이 접근할 수 없는 채널입니다. 채널 권한을 확인하세요.",
  DISCORD_CHANNEL_NOT_PRIVATE:
    "@everyone의 채널 보기를 차단하고 역할, 사용자 권한을 점검하세요.",
  DISCORD_PRIVACY_CONFIRMATION_REQUIRED:
    "채널을 볼 수 있는 역할, 사용자를 프로젝트 참여자로 제한했는지 확인하세요.",
  DISCORD_BOT_MISSING_PERMISSIONS:
    "봇에 채널 보기, 메시지, 스레드 권한이 필요합니다. Discord 채널 설정을 확인하세요.",
  DISCORD_LINK_DISABLED:
    "Discord 연결이 비활성화되었습니다. 채널, 스레드 권한을 직접 점검한 뒤 다시 연결하세요.",
};

export function settingsErrorMessage(error: {
  readonly code: string;
  readonly message: string;
}) {
  return messages[error.code] ?? error.message;
}
