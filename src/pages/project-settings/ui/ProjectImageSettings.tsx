"use client";

import { useId, useState } from "react";
import {
  settingsErrorMessage,
  useProjectImage,
  validateProjectImage,
} from "@/features/project-settings";
import { normalizeApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import { ProjectAvatar } from "@/entities/project";
import type { SettingsProps } from "../model/props";
import { Panel } from "./Panel";

/** 이미지는 고르면 바로 올린다(저장 버튼 없음). 결과는 같은 줄에 적는다. */
export function ProjectImageSettings({
  project,
  onSaved,
  canManage,
}: Pick<SettingsProps, "project" | "onSaved"> & {
  readonly canManage: boolean;
}) {
  const id = useId();
  const image = useProjectImage(project.id, onSaved);
  const [validation, setValidation] = useState<string | null>(null);
  const error =
    validation ??
    (image.isError
      ? settingsErrorMessage(normalizeApiError(image.error))
      : null);
  return (
    <Panel title="프로젝트 이미지">
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <ProjectAvatar project={project} size="lg" />
        {canManage && (
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                id={id}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="peer sr-only"
                disabled={image.isPending}
                onChange={(event) => {
                  const selected = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!selected) return;
                  image.reset();
                  const problem = validateProjectImage(selected);
                  setValidation(problem);
                  if (!problem) image.mutate(selected);
                }}
              />
              <label
                htmlFor={id}
                className="ui-button ui-button-secondary ui-button-sm cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-brand"
                aria-disabled={image.isPending || undefined}
              >
                {image.isPending && image.variables !== null
                  ? "올리는 중"
                  : "이미지 변경"}
              </label>
              {project.imageUrl && (
                <Button
                  variant="ghost"
                  className="ui-button-sm"
                  disabled={image.isPending}
                  loading={image.isPending && image.variables === null}
                  onClick={() => {
                    setValidation(null);
                    image.mutate(null);
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : (
              <p role="status" className="text-xs text-muted">
                {image.isSuccess ? "저장했어요" : "PNG, JPEG, WebP, 2MB 이하"}
              </p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
