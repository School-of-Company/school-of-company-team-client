"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DiscordChannelForm,
  RepositorySettings,
} from "@/features/project-integrations";
import { getSettingsPermissions } from "@/features/project-settings";
import { NotificationSettingsForm } from "@/features/notification-settings";
import { IntakeFormSettings } from "@/features/manage-intake-forms";
import { AutomationSettings } from "./AutomationSettings";
import type { SettingsProps } from "../model/props";
import { GeneralSettings } from "./GeneralSettings";
import { MemberSettings } from "./MemberSettings";
import { PartSettings } from "./PartSettings";
import { BucketSettings } from "./BucketSettings";
import { ArchiveProjectSection } from "./ArchiveProjectSection";
import { EmptyState } from "@/shared/ui";

export function SettingsPanels(props: SettingsProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const selected = search?.get("tab");
  const manager =
    props.user.role === "LEAD" || props.project.pmUserId === props.user.id;
  // 자동화·접수 양식 탭은 헤드 어드민·PM 에게만 있다(규칙·양식 API 도 ADMIN 만 허용). 다른 사람의 ?tab= 은 기본 정보로.
  const tab =
    selected === "members" ||
    selected === "integrations" ||
    selected === "buckets" ||
    selected === "notifications" ||
    ((selected === "automation" || selected === "intake") && manager)
      ? selected
      : "general";
  const permissions = getSettingsPermissions(props.user, props.project);
  return (
    <div className="grid gap-10">
      <nav aria-label="설정 영역" className="settings-nav">
        {(
          [
            ["general", "기본 정보"],
            ["members", "멤버와 권한"],
            ["integrations", "연동"],
            ["buckets", "계획 버킷"],
            ["notifications", "알림"],
            ...(manager
              ? ([
                  ["automation", "자동화"],
                  ["intake", "접수 양식"],
                ] as const)
              : []),
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
          설정은 읽기 전용입니다. 헤드 어드민 또는 PM이 변경할 수 있습니다.
        </p>
      )}
      {tab === "general" && (
        <div className="grid gap-10">
          <section className="grid gap-5" aria-labelledby="general-heading">
            {/* 탭 이름과 같아 화면에는 숨기고 구역 이름으로만 쓴다. */}
            <h2 id="general-heading" className="sr-only">
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
      {tab === "buckets" && (
        <section className="grid gap-5" aria-labelledby="buckets-heading">
          {/* 탭 이름과 같아 화면에는 숨기고 구역 이름으로만 쓴다. */}
          <h2 id="buckets-heading" className="sr-only">
            계획 버킷
          </h2>
          <BucketSettings {...props} />
        </section>
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
            <EmptyState
              title="연동 설정 권한이 없습니다"
              description="저장소와 채널 연동은 헤드 어드민 또는 PM이 관리합니다."
            />
          )}
        </div>
      )}
      {tab === "notifications" && (
        <section className="grid gap-5" aria-labelledby="notify-heading">
          <h2 id="notify-heading" className="text-xl font-semibold">
            Discord 알림
          </h2>
          <NotificationSettingsForm
            projectId={props.project.id}
            editable={permissions.manage}
            channelHref={manager ? `${pathname}?tab=integrations` : undefined}
          />
        </section>
      )}
      {tab === "automation" && (
        <section className="grid gap-5" aria-labelledby="automation-heading">
          <h2 id="automation-heading" className="text-xl font-semibold">
            자동화 규칙
          </h2>
          <AutomationSettings
            project={props.project}
            activeUserIds={new Set(props.candidates.map((user) => user.id))}
            editable={permissions.manage}
          />
        </section>
      )}
      {tab === "intake" && (
        <section className="grid gap-5" aria-labelledby="intake-heading">
          <h2 id="intake-heading" className="text-xl font-semibold">
            요구사항 접수 양식
          </h2>
          <IntakeFormSettings
            projectId={props.project.id}
            editable={permissions.manage}
          />
        </section>
      )}
      {tab === "general" && permissions.archive && (
        <ArchiveProjectSection
          project={props.project}
          onSaved={props.onSaved}
        />
      )}
    </div>
  );
}
