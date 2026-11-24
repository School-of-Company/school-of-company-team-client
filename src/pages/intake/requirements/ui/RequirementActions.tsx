"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import {
  reasonRequired,
  requirementApi,
  requirementErrorMessage,
  requirementStatusLabels,
  StatusLinkOnce,
  teamStatusTargets,
  type RequirementDetail,
  type RequirementStatus,
} from "@/entities/requirement";
import { routes } from "@/shared/config";
import { Button, Dialog, Field, Select, Textarea, useToast } from "@/shared/ui";
import { useRequirementChange } from "../api/change";

type Confirm = "token" | "purge" | "delete" | null;

/** 오른쪽 열의 관리 동작. 권한은 서버의 canManage(ADMIN·LEAD)와 헤드 어드민 여부로만 정한다(2절 표). */
export function RequirementActions({
  requirement,
  lead,
}: {
  readonly requirement: RequirementDetail;
  readonly lead: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const reissue = useRequirementChange(requirement.id, () =>
    requirementApi.reissueStatusToken(requirement.id),
  );
  const purge = useRequirementChange(requirement.id, () =>
    requirementApi.purgeRequester(requirement.id),
  );
  const remove = useRequirementChange(requirement.id, () =>
    requirementApi.remove(requirement.id),
  );
  const pending = reissue.isPending || purge.isPending || remove.isPending;
  if (!requirement.canManage && !lead) return null;
  return (
    <div className="grid gap-6">
      {requirement.canManage && (
        <StatusForm
          key={`${requirement.status}:${requirement.statusReason ?? ""}`}
          requirement={requirement}
        />
      )}
      {lead && <MoveForm requirement={requirement} />}
      <section className="grid gap-2" aria-label="그 밖의 동작">
        {requirement.canManage && (
          <Button variant="secondary" onClick={() => setConfirm("token")}>
            상태 링크 재발급
          </Button>
        )}
        {lead && requirement.requester && (
          <Button variant="secondary" onClick={() => setConfirm("purge")}>
            요청자 정보 삭제
          </Button>
        )}
        {lead && (
          <Button variant="danger" onClick={() => setConfirm("delete")}>
            요구사항 삭제
          </Button>
        )}
      </section>
      <Dialog
        open={confirm !== null || issued !== null}
        onClose={() => {
          if (pending) return;
          // 토큰은 이 대화상자에만 있고 닫으면 버린다(다시 볼 수 없다).
          setIssued(null);
          setConfirm(null);
        }}
        title={
          issued
            ? "새 상태 링크"
            : confirm === "token"
              ? "상태 링크를 재발급할까요?"
              : confirm === "purge"
                ? "요청자 정보를 지울까요?"
                : "요구사항을 삭제할까요?"
        }
      >
        {issued ? (
          <div className="grid gap-4">
            <StatusLinkOnce token={issued} audience="team" />
            <div className="flex justify-end">
              <Button onClick={() => setIssued(null)}>닫기</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted">
              {confirm === "token"
                ? "요청자가 링크를 잃었을 때 씁니다. 이전 링크는 바로 열리지 않습니다."
                : confirm === "purge"
                  ? "이름·소속·이메일·연락처를 바로 지웁니다. 제출 내용은 남습니다. 되돌릴 수 없습니다."
                  : "제출 내용·메시지·기록을 모두 지웁니다. 스팸이면 상태를 스팸으로 두면 30일 뒤 자동으로 지워집니다. 되돌릴 수 없습니다."}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirm(null)}
              >
                취소
              </Button>
              <Button
                variant={confirm === "token" ? "primary" : "danger"}
                loading={pending}
                onClick={() => {
                  const onError = (error: unknown) =>
                    toast(requirementErrorMessage(error), "error");
                  if (confirm === "token")
                    reissue.mutate(undefined, {
                      onSuccess: (result) => {
                        setConfirm(null);
                        setIssued(result.statusToken);
                      },
                      onError,
                    });
                  else if (confirm === "purge")
                    purge.mutate(undefined, {
                      onSuccess: () => {
                        setConfirm(null);
                        toast("요청자 정보를 지웠습니다.", "success");
                      },
                      onError,
                    });
                  else
                    remove.mutate(undefined, {
                      onSuccess: () => {
                        toast("요구사항을 삭제했습니다.", "success");
                        router.replace(routes.requirements);
                      },
                      onError,
                    });
                }}
              >
                {confirm === "token"
                  ? "재발급"
                  : confirm === "purge"
                    ? "지우기"
                    : "삭제"}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function StatusForm({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  const id = useId();
  const toast = useToast();
  const targets = teamStatusTargets(requirement.status);
  const [status, setStatus] = useState<RequirementStatus>(requirement.status);
  const [reason, setReason] = useState(requirement.statusReason ?? "");
  const [error, setError] = useState<string | null>(null);
  const change = useRequirementChange(
    requirement.id,
    (input: { status: RequirementStatus; reason?: string }) =>
      requirementApi.changeStatus(requirement.id, input),
  );
  if (targets.length === 0)
    return (
      <p className="text-sm text-muted">
        {requirementStatusLabels[requirement.status]} 상태는 바꿀 수 없습니다.
      </p>
    );
  const needsReason = reasonRequired(status);
  return (
    <form
      noValidate
      className="grid gap-3"
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        const text = reason.trim();
        if (needsReason && !text) {
          setError("보류·반려에는 사유가 필요합니다. 요청자에게 보입니다.");
          return;
        }
        if (text.length > 1000) {
          setError("사유는 1000자 이하입니다.");
          return;
        }
        if (change.isPending) return;
        change.mutate(
          { status, ...(text ? { reason: text } : {}) },
          {
            onSuccess: () => {
              setError(null);
              toast("상태를 바꿨습니다.", "success");
            },
            onError: (problem) => setError(requirementErrorMessage(problem)),
          },
        );
      }}
    >
      <h2 id={`${id}-title`} className="text-sm font-semibold">
        상태 변경
      </h2>
      <Select
        aria-label="새 상태"
        value={status}
        onChange={(event) => setStatus(event.target.value as RequirementStatus)}
      >
        {targets.map((value) => (
          <option key={value} value={value}>
            {requirementStatusLabels[value]}
          </option>
        ))}
      </Select>
      <Field
        id={`${id}-reason`}
        label={needsReason ? "사유 (필수)" : "사유"}
        hint="요청자 상태 페이지에 보입니다. 비우면 지웁니다."
        error={error ?? undefined}
      >
        <Textarea
          id={`${id}-reason`}
          maxLength={1000}
          className="min-h-20"
          value={reason}
          aria-invalid={!!error || undefined}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div>
        <Button type="submit" variant="secondary" loading={change.isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}

/** 프로젝트 지정(17, 헤드 어드민). 조직 단위를 프로젝트로 옮기거나 다른 프로젝트로 옮긴다. */
function MoveForm({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  const id = useId();
  const toast = useToast();
  const projects = useQuery(projectQueries.list());
  const [projectId, setProjectId] = useState("");
  const move = useRequirementChange(requirement.id, (target: string) =>
    requirementApi.move(requirement.id, target),
  );
  const options =
    projects.data?.filter(
      (project) => !project.archived && project.id !== requirement.projectId,
    ) ?? [];
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!projectId || move.isPending) return;
        move.mutate(projectId, {
          onSuccess: () => {
            setProjectId("");
            toast("프로젝트를 지정했습니다.", "success");
          },
          onError: (error) => toast(requirementErrorMessage(error), "error"),
        });
      }}
    >
      <label htmlFor={`${id}-project`} className="text-sm font-semibold">
        {requirement.projectId ? "다른 프로젝트로 옮기기" : "프로젝트 지정"}
      </label>
      <Select
        id={`${id}-project`}
        value={projectId}
        disabled={projects.isPending}
        onChange={(event) => setProjectId(event.target.value)}
      >
        <option value="">프로젝트 고르기</option>
        {options.map((project) => (
          <option key={project.id} value={project.id}>
            {project.key} · {project.name}
          </option>
        ))}
      </Select>
      <div>
        <Button
          type="submit"
          variant="secondary"
          disabled={!projectId}
          loading={move.isPending}
        >
          옮기기
        </Button>
      </div>
    </form>
  );
}
