import type { TaskComment } from "../api/comments";

export const COMMENT_MAX_LENGTH = 10_000;

/** 서버와 같은 규칙(s22 D22-14): 수정은 작성자만, 삭제는 작성자 또는 헤드 어드민(LEAD). */
export function commentPermissions(
  comment: Pick<TaskComment, "author">,
  viewer: { readonly id: string; readonly role: string } | undefined,
) {
  const own = !!viewer && !!comment.author && comment.author.id === viewer.id;
  return {
    canEdit: own,
    canDelete: own || viewer?.role === "LEAD",
  };
}

/** 보낼 수 없으면 이유, 보낼 수 있으면 null. */
export function commentBodyError(body: string): string | null {
  if (!body.trim()) return "댓글을 적어 주세요.";
  if (body.length > COMMENT_MAX_LENGTH)
    return `댓글은 ${COMMENT_MAX_LENGTH.toLocaleString("ko-KR")}자까지 쓸 수 있어요.`;
  return null;
}
