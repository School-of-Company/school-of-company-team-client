"use client";

import { useProjectArchive } from "../api/archive";
import {
  DiscordChannelForm,
  RepositorySettings,
} from "@/features/project-integrations";
import { getSettingsPermissions } from "@/features/project-settings";
import { Button } from "@/shared/ui";
import type { SettingsProps } from "../model/props";
import { GeneralSettings } from "./GeneralSettings";
import { MemberSettings } from "./MemberSettings";
import { PartSettings } from "./PartSettings";
import { MutationFeedback } from "./MutationFeedback";

export function SettingsPanels(props: SettingsProps) {
  const permissions = getSettingsPermissions(props.user, props.project);
  const archive = useProjectArchive(props.project.id, props.onSaved);
  const manager =
    props.user.role === "LEAD" || props.project.pmUserId === props.user.id;
  return (
    <div className="grid gap-10">
      {props.project.archived && (
        <p role="status" className="rounded-md bg-surface-hover p-4 text-sm">
          아카이브된 프로젝트입니다. 설정을 변경하려면 먼저 복원하세요.
        </p>
      )}
      {!manager && (
        <p className="text-sm text-muted">
          설정은 읽기 전용입니다. 파트 리더는 자기 파트 구성원만 변경할 수
          있습니다.
        </p>
      )}
      <section className="grid gap-5" aria-labelledby="general-heading">
        <h2 id="general-heading" className="text-xl font-semibold">
          일반 설정
        </h2>
        <GeneralSettings {...props} />
      </section>
      <section className="grid gap-5" aria-labelledby="members-heading">
        <h2 id="members-heading" className="text-xl font-semibold">
          참여자와 PM
        </h2>
        <MemberSettings {...props} />
      </section>
      <section className="grid gap-5" aria-labelledby="parts-heading">
        <h2 id="parts-heading" className="text-xl font-semibold">
          파트
        </h2>
        <PartSettings {...props} />
      </section>
      {manager && (
        <>
          <section className="grid gap-5" aria-labelledby="github-heading">
            <h2 id="github-heading" className="text-xl font-semibold">
              GitHub 저장소
            </h2>
            <RepositorySettings
              projectId={props.project.id}
              disabled={!permissions.manage}
            />
          </section>
          <section className="grid gap-5" aria-labelledby="discord-heading">
            <h2 id="discord-heading" className="text-xl font-semibold">
              Discord 채널
            </h2>
            <DiscordChannelForm
              projectId={props.project.id}
              membersOnly={props.project.visibility === "MEMBERS"}
              disabled={!permissions.manage}
            />
          </section>
        </>
      )}
      {permissions.archive && (
        <section
          className="grid gap-4 border-t border-border pt-6"
          aria-labelledby="archive-heading"
        >
          <h2 id="archive-heading" className="text-xl font-semibold">
            아카이브
          </h2>
          <p className="text-sm text-muted">
            아카이브하면 조회만 가능하며 기본 보드·내 보드에서 제외됩니다.
            기록은 보존됩니다.
          </p>
          <Button
            variant="secondary"
            loading={archive.isPending}
            onClick={() =>
              archive.mutate(props.project.archived ? "restore" : "archive")
            }
          >
            {props.project.archived ? "프로젝트 복원" : "프로젝트 아카이브"}
          </Button>
          <MutationFeedback error={archive.error} success={archive.isSuccess} />
        </section>
      )}
    </div>
  );
}
