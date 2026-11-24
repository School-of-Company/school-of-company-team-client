"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/shared/ui";
import type { Project } from "../model/types";
import { projectApi, projectKeys } from "../api/projects";

export function ProjectAvatar({
  project,
  size,
}: {
  readonly project: Pick<Project, "id" | "key" | "imageUrl">;
  readonly size?: "sm" | "lg";
}) {
  const url = project.imageUrl;
  const image = useQuery({
    queryKey: [...projectKeys.detail(project.id), "image", url ?? null],
    queryFn: () => projectApi.image(project.id, url ?? ""),
    enabled: !!url,
    retry: false,
    refetchOnMount: "always",
  });
  return (
    <Avatar
      name={project.key}
      src={image.isError ? undefined : image.data}
      size={size}
    />
  );
}
