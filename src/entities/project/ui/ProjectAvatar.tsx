import { Avatar } from "@/shared/ui";
import type { Project } from "../model/types";

export function ProjectAvatar({
  project,
  size,
}: {
  readonly project: Pick<Project, "key" | "imageUrl">;
  readonly size?: "sm" | "lg";
}) {
  const url = project.imageUrl;
  const src = url?.startsWith("/")
    ? `${process.env.NEXT_PUBLIC_API_URL ?? ""}${url}`
    : (url ?? undefined);
  return <Avatar name={project.key} src={src} size={size} />;
}
