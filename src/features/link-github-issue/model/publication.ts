import { HIDDEN_REPOSITORY, repositoryName } from "@/shared/lib";
import type { PublicationRepository } from "./types";

/**
 * 발행 대상 저장소 이름. 공개 저장소이거나 지금 볼 수 있는 선택지에 있을 때만 이름을 쓴다.
 * 비공개로 바뀌었거나 권한이 없어 목록에서 빠졌으면 "비공개 저장소"로 쓴다.
 */
export function publicationName(
  publication: {
    readonly projectRepositoryId: string;
    readonly repositoryFullName: string;
    readonly publiclyVisible: boolean;
  },
  options: readonly PublicationRepository[] | undefined,
) {
  const listed = options?.find(
    (repository) => repository.id === publication.projectRepositoryId,
  );
  if (listed) return repositoryName(listed);
  return publication.publiclyVisible
    ? repositoryName({ fullName: publication.repositoryFullName })
    : HIDDEN_REPOSITORY;
}
