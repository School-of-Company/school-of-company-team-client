export function validateDiscordChannel(
  channelId: string,
  membersOnly: boolean,
  privacyConfirmed: boolean,
) {
  if (!/^[0-9]{17,20}$/.test(channelId)) {
    return "Discord 채널 ID는 숫자 17~20자리로 입력하세요.";
  }
  if (membersOnly && !privacyConfirmed) {
    return "채널을 볼 수 있는 역할·사용자를 프로젝트 참여자로 제한했는지 확인하세요.";
  }
  return null;
}
