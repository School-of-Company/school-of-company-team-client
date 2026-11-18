"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectDetail } from "@/entities/project";
import {
  sprintApi,
  sprintErrorMessage,
  sprintQueries,
  type Sprint,
  type SprintReview,
} from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Markdown,
  Skeleton,
  Textarea,
} from "@/shared/ui";
import { useSaveReview } from "../api/sprint-actions";

/**
 * Sprint Review. 관리자는 결정적 초안을 불러와 고치고 저장·게시한다.
 * 다른 사람은 게시된 본문만 본다(미게시면 404 → 없음으로 보인다).
 */
export function SprintReviewPanel({
  project,
  sprint,
  manages,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
  readonly manages: boolean;
}) {
  const review = useQuery({
    ...sprintQueries.review(project.id, sprint.id),
    enabled: sprint.status !== "PLANNED",
  });
  if (sprint.status === "PLANNED")
    return (
      <EmptyState
        title="Sprint를 시작하면 리뷰를 씁니다"
        description="완료·이월·막힘 업무로 초안을 만들어 PM이 고쳐 게시합니다."
      />
    );
  if (review.isPending)
    return (
      <div role="status" aria-label="리뷰 불러오는 중" className="grid gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48" />
      </div>
    );
  if (review.isError)
    return (
      <ErrorState
        title="리뷰를 불러오지 못했습니다"
        description={sprintErrorMessage(normalizeApiError(review.error))}
        onRetry={() => void review.refetch()}
      />
    );
  if (manages)
    return (
      <ReviewEditor
        // 편집 중인 본문은 폴링으로 덮어쓰지 않는다. 저장된 본문은 비교(바뀜 여부)에만 쓴다.
        key={sprint.id}
        project={project}
        sprint={sprint}
        saved={review.data}
      />
    );
  if (!review.data)
    return (
      <EmptyState
        title="아직 게시된 리뷰가 없습니다"
        description="PM이 리뷰를 게시하면 여기에서 볼 수 있습니다."
      />
    );
  return (
    <article className="review-body grid gap-3" aria-label="Sprint 리뷰">
      <ReviewStamp review={review.data} />
      <Markdown>{review.data.body}</Markdown>
    </article>
  );
}

function ReviewStamp({ review }: { readonly review: SprintReview }) {
  return (
    <p className="sprint-meta">
      {review.publishedAt ? (
        <span>
          {review.publishedBy?.name ?? review.updatedBy.name},{" "}
          {formatDate(review.publishedAt)} 게시
        </span>
      ) : (
        <span>게시 전</span>
      )}
      <span>
        {review.updatedBy.name},{" "}
        {formatDate(review.updatedAt, { hour: "numeric", minute: "2-digit" })}{" "}
        저장
      </span>
    </p>
  );
}

function ReviewEditor({
  project,
  sprint,
  saved,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
  readonly saved: SprintReview | null;
}) {
  const id = useId();
  const { save, publish } = useSaveReview(project.id, sprint.id);
  const [body, setBody] = useState(saved?.body ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [confirmDraft, setConfirmDraft] = useState(false);
  const [notice, setNotice] = useState<{
    readonly tone: "ok" | "error";
    readonly text: string;
  } | null>(null);
  const current = saved;
  const dirty = body !== (current?.body ?? "");
  const busy = save.isPending || publish.isPending || loadingDraft;
  const fail = (cause: unknown) =>
    setNotice({
      tone: "error",
      text: sprintErrorMessage(normalizeApiError(cause)),
    });
  async function loadDraft() {
    setConfirmDraft(false);
    setLoadingDraft(true);
    setNotice(null);
    try {
      const draft = await sprintApi.reviewDraft(project.id, sprint.id);
      setBody(draft.body);
      setMode("write");
      setNotice({
        tone: "ok",
        text: "초안을 불러왔습니다. 고친 뒤 저장하세요.",
      });
    } catch (cause) {
      fail(cause);
    } finally {
      setLoadingDraft(false);
    }
  }
  return (
    <div className="grid gap-4">
      <div className="review-toolbar">
        <div className="ui-segmented" role="group" aria-label="리뷰 보기">
          {(["write", "preview"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="ui-segmented-option"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value === "write" ? "작성" : "미리보기"}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          className="ui-button-sm"
          loading={loadingDraft}
          disabled={busy}
          onClick={() =>
            body.trim() ? setConfirmDraft(true) : void loadDraft()
          }
        >
          초안 불러오기
        </Button>
      </div>
      {current ? (
        <ReviewStamp review={current} />
      ) : (
        <p className="sprint-meta">저장한 리뷰가 없습니다.</p>
      )}
      <label htmlFor={`${id}-body`} className="sr-only">
        리뷰 본문
      </label>
      <Textarea
        id={`${id}-body`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={20000}
        hidden={mode === "preview"}
        className="review-textarea font-mono"
        aria-describedby={`${id}-hint`}
        disabled={busy}
      />
      {mode === "preview" && (
        <div className="review-preview">
          {body.trim() ? (
            <Markdown>{body}</Markdown>
          ) : (
            <p className="text-sm text-muted">미리 볼 내용이 없습니다.</p>
          )}
        </div>
      )}
      <p id={`${id}-hint`} className="text-xs text-muted">
        초안은 완료·merge된 PR·이월·막힘 업무로 만듭니다. 비공개 원본 업무와
        비공개 저장소 PR은 게시 범위 때문에 넣지 않습니다.
      </p>
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`text-sm ${notice.tone === "error" ? "text-danger" : ""}`}
        >
          {notice.text}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {dirty && current?.publishedAt && (
          <span className="text-xs text-muted">
            저장하면 게시된 본문도 바뀝니다.
          </span>
        )}
        <Button
          variant="secondary"
          loading={save.isPending}
          disabled={busy || !dirty || !body.trim()}
          onClick={() =>
            save.mutate(body, {
              onSuccess: () =>
                setNotice({ tone: "ok", text: "리뷰를 저장했습니다." }),
              onError: fail,
            })
          }
        >
          저장
        </Button>
        {!current?.publishedAt && (
          <Button
            loading={publish.isPending}
            disabled={busy || dirty || !current}
            aria-describedby={
              dirty || !current ? `${id}-publish-hint` : undefined
            }
            onClick={() =>
              publish.mutate(undefined, {
                onSuccess: () =>
                  setNotice({
                    tone: "ok",
                    text: "리뷰를 게시했습니다. 프로젝트 조회자 모두가 봅니다.",
                  }),
                onError: fail,
              })
            }
          >
            게시
          </Button>
        )}
      </div>
      {!current?.publishedAt && (dirty || !current) && (
        <p id={`${id}-publish-hint`} className="text-right text-xs text-muted">
          저장한 본문만 게시할 수 있습니다.
        </p>
      )}
      <Dialog
        open={confirmDraft}
        onClose={() => setConfirmDraft(false)}
        title="초안으로 바꿀까요?"
      >
        <p className="mb-6 text-sm text-muted">
          지금 작성 중인 본문을 새 초안으로 덮어씁니다. 저장하지 않은 내용은
          사라집니다.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDraft(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={() => void loadDraft()}>
            덮어쓰기
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
