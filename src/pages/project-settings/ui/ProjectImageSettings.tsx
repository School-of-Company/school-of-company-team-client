"use client";

import { useEffect, useRef, useState } from "react";
import {
  useProjectImage,
  validateProjectImage,
} from "@/features/project-settings";
import { Avatar, Button, Field, Input } from "@/shared/ui";
import { ProjectAvatar } from "@/entities/project";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";

export function ProjectImageSettings({
  project,
  onSaved,
  canManage,
}: Pick<SettingsProps, "project" | "onSaved"> & {
  readonly canManage: boolean;
}) {
  const image = useProjectImage(project.id, onSaved);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [validation, setValidation] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const clearSelection = () => {
    setFile(null);
    setPreview(undefined);
    if (input.current) input.current.value = "";
  };
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  return (
    <section className="grid gap-3" aria-label="프로젝트 이미지">
      {file ? (
        <Avatar name={project.key} src={preview} size="lg" />
      ) : (
        <ProjectAvatar project={project} size="lg" />
      )}
      {canManage && (
        <>
          <Field
            id="project-image"
            label="프로젝트 이미지"
            hint="PNG, JPEG, WebP (최대 2MB)"
          >
            <Input
              ref={input}
              id="project-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={image.isPending}
              aria-describedby="project-image-hint"
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0];
                image.reset();
                const error = selected ? validateProjectImage(selected) : null;
                setValidation(error);
                setFile(selected && !error ? selected : null);
                setPreview(
                  selected && !error
                    ? URL.createObjectURL(selected)
                    : undefined,
                );
                if (error) event.currentTarget.value = "";
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!file || image.isPending}
              loading={image.isPending && image.variables !== null}
              onClick={() => {
                if (file)
                  image.mutate(file, {
                    onSuccess: clearSelection,
                  });
              }}
            >
              이미지 저장
            </Button>
            {project.imageUrl && (
              <Button
                variant="ghost"
                disabled={image.isPending}
                loading={image.isPending && image.variables === null}
                onClick={() =>
                  image.mutate(null, {
                    onSuccess: clearSelection,
                  })
                }
              >
                이미지 삭제
              </Button>
            )}
          </div>
        </>
      )}
      {validation && (
        <p role="alert" className="text-sm text-danger">
          {validation}
        </p>
      )}
      <MutationFeedback error={image.error} success={image.isSuccess} />
    </section>
  );
}
