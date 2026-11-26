"use client";

import { useId, useState } from "react";
import { Button, Dialog, Field, Input } from "@/shared/ui";
import { useProjectArchive } from "../api/archive";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";
import { Panel } from "./Panel";

export function ArchiveProjectSection({
  project,
  onSaved,
}: Pick<SettingsProps, "project" | "onSaved">) {
  const id = useId();
  const [confirming, setConfirming] = useState(false);
  const [key, setKey] = useState("");
  const archive = useProjectArchive(project.id, onSaved);
  const close = () => {
    if (!archive.isPending) setConfirming(false);
  };
  return (
    <Panel title="위험 영역" tone="danger">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-foreground-2">
          {project.archived
            ? "복원하면 다시 보드와 내 업무에 보여요."
            : "아카이브하면 조회만 할 수 있고 보드와 내 업무에서 빠져요. 기록은 남아요."}
        </p>
        <Button
          variant={project.archived ? "secondary" : "danger"}
          loading={archive.isPending}
          onClick={() => {
            if (project.archived) archive.mutate("restore");
            else {
              setKey("");
              archive.reset();
              setConfirming(true);
            }
          }}
        >
          {project.archived ? "프로젝트 복원" : "프로젝트 아카이브"}
        </Button>
      </div>
      {!confirming && (
        <MutationFeedback error={archive.error} success={archive.isSuccess} />
      )}
      <Dialog
        open={confirming}
        onClose={close}
        title="프로젝트를 아카이브할까요?"
      >
        <div className="grid gap-5">
          <p className="text-sm text-foreground-2">
            기록은 남고 나중에 복원할 수 있어요. 확인하려면 프로젝트 키{" "}
            <strong className="font-mono">{project.key}</strong>를 입력하세요.
          </p>
          <Field id={`${id}-key`} label="프로젝트 키">
            <Input
              id={`${id}-key`}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={archive.isPending}
              autoFocus
            />
          </Field>
          <MutationFeedback error={archive.error} success={false} />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={close}
              disabled={archive.isPending}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={archive.isPending}
              disabled={key !== project.key}
              onClick={() => {
                if (key === project.key)
                  archive.mutate("archive", {
                    onSuccess: () => setConfirming(false),
                  });
              }}
            >
              아카이브
            </Button>
          </div>
        </div>
      </Dialog>
    </Panel>
  );
}
