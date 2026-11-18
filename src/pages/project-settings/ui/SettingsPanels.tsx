"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const search = useSearchParams();
  const selected = search?.get("tab");
  const tab =
    selected === "members" || selected === "integrations"
      ? selected
      : "general";
  const [confirmArchive, setConfirmArchive] = useState(false);
  const permissions = getSettingsPermissions(props.user, props.project);
  const archive = useProjectArchive(props.project.id, props.onSaved);
  const manager =
    props.user.role === "LEAD" || props.project.pmUserId === props.user.id;
  return (
    <div className="grid gap-10">
      <nav aria-label="설정 영역" className="settings-nav">
        {(
          [
            ["general", "기본 정보"],
            ["members", "멤버·권한"],
            ["integrations", "연동"],
          ] as const
        ).map(([value, label]) => {
          const params = new URLSearchParams(search?.toString());
          params.set("tab", value);
          return (
            <Link
              key={value}
              href={`${pathname}?${params}`}
              scroll={false}
              aria-current={tab === value ? "page" : undefined}
              className="ui-nav-link"
            >
              {label}
            </Link>
          );
        })}
      </nav>
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
      {tab === "general" && (
        <div className="grid gap-10">
          <section className="grid gap-5" aria-labelledby="general-heading">
            <h2 id="general-heading" className="text-xl font-semibold">
              기본 정보
            </h2>
            <GeneralSettings {...props} />
          </section>
        </div>
      )}
      {tab === "members" && (
        <div className="grid gap-10">
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
        </div>
      )}
      {tab === "integrations" && (
        <div className="grid gap-10">
          {manager ? (
            <>
              <section className="grid gap-5" aria-labelledby="github-heading">
                <h2 id="github-heading" className="text-xl font-semibold">
                  GitHub 저장소
                </h2>
                <RepositorySettings
                  projectId={props.project.id}
                  projectKey={props.project.key}
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
          ) : (
            <p className="text-sm text-muted">
              저장소와 채널 연동은 헤드 어드민 또는 PM이 관리합니다.
            </p>
          )}
        </div>
      )}
      {tab === "general" && permissions.archive && (
        <section
          className="grid gap-4 border-t border-border pt-6"
          aria-labelledby="archive-heading"
        >
          <h2 id="archive-heading" className="text-xl font-semibold">
            위험 영역
          </h2>
          <p className="text-sm text-muted">
            아카이브하면 조회만 가능하며 기본 보드·내 보드에서 제외됩니다.
            기록은 보존됩니다.
          </p>
          {confirmArchive && (
            <p role="alert" className="text-sm">
              프로젝트를 아카이브할까요? 기록은 보존되며 나중에 복원할 수
              있습니다.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={archive.isPending}
              onClick={() => {
                if (!props.project.archived && !confirmArchive) {
                  setConfirmArchive(true);
                  return;
                }
                archive.mutate(props.project.archived ? "restore" : "archive", {
                  onSuccess: () => setConfirmArchive(false),
                });
              }}
            >
              {props.project.archived ? "프로젝트 복원" : "프로젝트 아카이브"}
            </Button>
            {confirmArchive && (
              <Button
                variant="ghost"
                disabled={archive.isPending}
                onClick={() => setConfirmArchive(false)}
              >
                취소
              </Button>
            )}
          </div>
          <MutationFeedback error={archive.error} success={archive.isSuccess} />
        </section>
      )}
    </div>
  );
}
