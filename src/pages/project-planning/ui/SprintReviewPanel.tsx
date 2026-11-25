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
 * 스프린트 결과 보고(서버 이름 review). 관리자는 결정적 초안을 불러와 고치고 저장·게시한다.
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
  return (
    <section className="grid gap-4" aria-label="스프린트 결과 보고">
      <p className="planning-note">
        스프린트에서 끝낸 것, 머지된 PR, 이월, 막힌 업무를 모은 결과 보고예요.
        PM이 다듬어 게시하면 프로젝트 참여자 모두가 보고 Discord에도 공유돼요.
      </p>
      <ReviewContent project={project} sprint={sprint} manages={manages} />
    </section>
  );
}

function ReviewContent({
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
        title="아직 결과 보고를 쓸 수 없습니다"
        description="스프린트를 시작한 뒤 초안을 불러올 수 있습니다. 종료 후 결과를 정리해 게시하세요."
      />
    );
  if (review.isPending)
    return (
      <div role="status" aria-label="결과 보고 불러오는 중" className="grid gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48" />
      </div>
    );
  if (review.isError)
    return (
      <ErrorState
        title="결과 보고를 불러오지 못했습니다"
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
        title="게시된 결과 보고가 없습니다"
        description="PM이 결과 보고를 게시하면 여기에서 볼 수 있습니다."
      />
    );
  return (
    <article className="review-body grid gap-3" aria-label="스프린트 결과 보고">
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
  // 이미 게시한 결과 보고는 읽는 모습부터 보여 준다.
  const [mode, setMode] = useState<"write" | "preview">(
    saved?.publishedAt ? "preview" : "write",
  );
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
        <div className="ui-segmented" role="group" aria-label="결과 보고 보기">
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
        <p className="sprint-meta">저장한 결과 보고가 없습니다.</p>
      )}
      <label htmlFor={`${id}-body`} className="sr-only">
        결과 보고 본문
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
        초안은 완료, 머지된 PR, 이월, 막힘 업무로 만듭니다. 비공개 원본 업무와
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
                setNotice({ tone: "ok", text: "결과 보고를 저장했습니다." }),
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
                    text: "결과 보고를 게시했습니다. 프로젝트 참여자 모두가 보고 Discord에도 공유했습니다.",
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
