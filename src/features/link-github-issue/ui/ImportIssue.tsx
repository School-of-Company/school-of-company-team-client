"use client";

import { useState, type FormEvent } from "react";
import { normalizeApiError } from "@/shared/api";
import { Button, Dialog, Field, Input } from "@/shared/ui";
import { taskGithubApi } from "../api/github";

export function ImportIssue({
  projectId,
  onImported,
}: {
  readonly projectId?: string;
  readonly onImported: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const url = String(new FormData(event.currentTarget).get("url") ?? "");
    setPending(true);
    setError("");
    try {
      const result = await taskGithubApi.importIssue({
        url,
        scope: projectId ? "PROJECT" : "PERSONAL",
        ...(projectId ? { projectId } : {}),
      });
      setOpen(false);
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
    }
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Issue 가져오기
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        title="GitHub Issue 가져오기"
      >
        <form className="grid gap-4" onSubmit={submit}>
          <p className="text-sm text-muted">
            {projectId
              ? "공개 Issue의 제목·본문을 프로젝트 업무로 복사합니다."
              : "Issue의 제목·본문을 본인 개인 업무로 복사합니다."}{" "}
            같은 Issue를 다시 가져오면 기존 업무로 이동합니다.
          </p>
          <Field id="import-issue-url" label="Issue URL">
            <Input
              id="import-issue-url"
              name="url"
              type="url"
              required
              maxLength={500}
              autoFocus
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={pending}>
            가져오기
          </Button>
        </form>
      </Dialog>
    </>
  );
}
