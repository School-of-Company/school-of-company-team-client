import type { ProjectDetail } from "@/entities/project";
import type { User, UserSummary } from "@/entities/user";

export type SettingsProps = {
  readonly candidates: readonly UserSummary[];
  readonly project: ProjectDetail;
  readonly user: Pick<User, "id" | "role">;
  readonly onSaved: () => Promise<unknown>;
};
