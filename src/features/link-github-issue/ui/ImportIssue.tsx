"use client";

import { useState, type FormEvent } from "react";
import { normalizeApiError } from "@/shared/api";
import { Button, Field, Input } from "@/shared/ui";
import { taskGithubApi } from "../api/github";

/** 업무 등록 창의 "Issue 가져오기" 탭. Issue 를 업무로 복사하고 만든 업무 id 를 돌려준다. */
export function ImportIssueForm({
  projectId,
  onImported,
  onCancel,
  onPending,
}: {
  readonly projectId?: string;
  readonly onImported: (id: string) => void;
  readonly onCancel: () => void;
  /** 가져오는 동안 창을 닫지 않게 호출부에 알린다. */
  readonly onPending?: (pending: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const url = String(new FormData(event.currentTarget).get("url") ?? "");
    setPending(true);
    onPending?.(true);
    setError("");
    try {
      const result = await taskGithubApi.importIssue({
        url,
        scope: projectId ? "PROJECT" : "PERSONAL",
        ...(projectId ? { projectId } : {}),
      });
      onImported(result.taskId);
    } catch (cause) {
      const problem = normalizeApiError(cause);
      setError(
        problem.code === "GITHUB_PRIVATE_IMPORT_RESTRICTED"
          ? "비공개 Issue 본문은 개인 업무에만 가져올 수 있습니다. 프로젝트에서는 기존 Issue 링크를 연결해 주세요."
          : problem.message,
      );
    } finally {
      setPending(false);
      onPending?.(false);
    }
  }
  return (
    <form className="grid gap-5" onSubmit={submit}>
      <Field
        id="import-issue-url"
        label="Issue URL"
        hint={
          (projectId
            ? "공개 Issue의 제목과 본문을 프로젝트 업무로 복사합니다."
            : "Issue의 제목과 본문을 본인 개인 업무로 복사합니다.") +
          " 같은 Issue를 다시 가져오면 기존 업무로 이동합니다."
        }
      >
        <Input
          id="import-issue-url"
          name="url"
          type="url"
          required
          maxLength={500}
          placeholder="https://github.com/조직/저장소/issues/123"
          autoFocus
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        <Button type="submit" loading={pending}>
          가져오기
        </Button>
      </div>
    </form>
  );
}
