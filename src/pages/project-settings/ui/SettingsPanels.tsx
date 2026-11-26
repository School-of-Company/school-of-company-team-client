"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  DiscordChannelForm,
  RepositorySettings,
} from "@/features/project-integrations";
import { getSettingsPermissions } from "@/features/project-settings";
import {
  NotificationSettingsForm,
  notificationPolicy,
} from "@/features/notification-settings";
import { IntakeFormSettings } from "@/features/manage-intake-forms";
import { routes } from "@/shared/config";
import { Badge, EmptyState, InfoTip, Skeleton } from "@/shared/ui";
import { AutomationSettings } from "./AutomationSettings";
import type { SettingsProps } from "../model/props";
import {
  resolveSection,
  sectionPath,
  sectionSegment,
  settingsSections,
  visibleSections,
  type SettingsSection,
} from "../model/sections";
import { GeneralSettings } from "./GeneralSettings";
import { ProjectImageSettings } from "./ProjectImageSettings";
import { MemberSettings } from "./MemberSettings";
import { PartSettings } from "./PartSettings";
import { BucketSettings } from "./BucketSettings";
import { ArchiveProjectSection } from "./ArchiveProjectSection";
import { Panel, SettingsSection as Section } from "./Panel";
import { UnsavedChangesGuard, useUnsavedChanges } from "./UnsavedChanges";

/** 왼쪽(좁으면 위) 섹션 내비. 좁은 폭의 가로 줄에서는 현재 섹션을 보이는 자리로 굴린다. */
function SectionNav({
  links,
  current,
}: {
  readonly links: readonly {
    readonly id: SettingsSection;
    readonly label: string;
    readonly href?: string;
  }[];
  readonly current: SettingsSection | null;
}) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = nav.current;
    const active = element?.querySelector<HTMLElement>("[aria-current]");
    if (!element || !active || element.scrollWidth <= element.clientWidth)
      return;
    element.scrollLeft =
      active.offsetLeft - (element.clientWidth - active.clientWidth) / 2;
  }, [current]);
  return (
    <nav
      ref={nav}
      aria-label={current ? "설정 섹션" : undefined}
      aria-hidden={current ? undefined : true}
      className="settings-sidenav"
    >
      {links.map(({ id, label, href }) =>
        href ? (
          <Link
            key={id}
            href={href}
            scroll={false}
            aria-current={current === id ? "page" : undefined}
          >
            {label}
          </Link>
        ) : (
          // 대기 자리: href 없는 a 는 초점을 받지 않고 같은 스타일을 쓴다.
          <a key={id}>
            <span className="ui-skeleton-text">{label}</span>
          </a>
        ),
      )}
    </nav>
  );
}

/** 섹션 내비와 본문 자리. 설정을 불러오기 전에도 실제와 같은 두 열로 그린다. */
export function SettingsBodySkeleton() {
  return (
    <div className="settings-columns">
      <SectionNav links={settingsSections} current={null} />
      <div className="settings-section" aria-hidden="true">
        <div className="settings-section-head">
          <h2 className="settings-section-title">
            <span className="ui-skeleton-text">기본 정보</span>
          </h2>
        </div>
        <div className="settings-panel">
          <div className="settings-panel-head">
            <h3 className="settings-panel-title">
              <span className="ui-skeleton-text">프로젝트 정보</span>
            </h3>
          </div>
          <div className="settings-panel-body">
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanels(props: SettingsProps) {
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const router = useRouter();
  const manager =
    props.user.role === "LEAD" || props.project.pmUserId === props.user.id;
  const legacyTab = search?.get("tab") ?? null;
  const section = resolveSection(sectionSegment(pathname), legacyTab, manager);
  const settingsPath = routes.projectSettings(props.project.id);
  const canonical = sectionPath(settingsPath, section);
  // 예전 `?tab=` 주소와 볼 수 없는 섹션 주소는 같은 화면을 그린 채 주소만 바꾼다(기록을 늘리지 않는다).
  useEffect(() => {
    if (legacyTab === null && pathname === canonical) return;
    const params = new URLSearchParams(search?.toString());
    params.delete("tab");
    const query = params.toString();
    router.replace(query ? `${canonical}?${query}` : canonical, {
      scroll: false,
    });
  }, [legacyTab, pathname, canonical, search, router]);
  // 섹션을 바꿨는데 본문 머리가 화면 위로 지나가 있으면 본문 머리로 올린다.
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const top = content.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) content.current?.scrollIntoView({ block: "start" });
  }, [section]);
  const permissions = getSettingsPermissions(props.user, props.project);
  const readOnly = !manager && (
    <span className="flex items-center gap-1">
      <Badge>읽기 전용</Badge>
      <InfoTip label="읽기 전용 이유" align="end">
        헤드 어드민과 PM만 설정을 바꿀 수 있어요.
      </InfoTip>
    </span>
  );
  const title = settingsSections.find(({ id }) => id === section)!.label;
  return (
    <UnsavedChangesGuard>
      <div className="settings-columns">
        <SectionNav
          current={section}
          links={visibleSections(manager).map(({ id, label }) => ({
            id,
            label,
            href: sectionPath(settingsPath, id),
          }))}
        />
        <div ref={content} className="grid min-w-0 scroll-mt-6 gap-5">
          {props.project.archived && (
            <p
              role="status"
              className="rounded-xl bg-surface-hover p-4 text-sm"
            >
              아카이브된 프로젝트예요. 설정을 바꾸려면 기본 정보 아래에서
              복원하세요.
            </p>
          )}
          <Section title={title} badge={readOnly}>
            {section === "general" && (
              <>
                <ProjectImageSettings
                  project={props.project}
                  onSaved={props.onSaved}
                  canManage={permissions.manage}
                />
                <GeneralSettings {...props} />
                {permissions.archive && (
                  <ArchiveProjectSection
                    project={props.project}
                    onSaved={props.onSaved}
                  />
                )}
              </>
            )}
            {section === "members" && (
              <>
                <MemberSettings {...props} />
                <PartSettings {...props} />
              </>
            )}
            {section === "integrations" &&
              (manager ? (
                <IntegrationPanels {...props} editable={permissions.manage} />
              ) : (
                <EmptyState
                  title="연동 설정 권한이 없어요"
                  description="저장소와 채널 연동은 헤드 어드민이나 PM이 관리해요."
                />
              ))}
            {section === "buckets" && <BucketSettings {...props} />}
            {section === "notifications" && (
              <Panel title="Discord 알림" info={notificationPolicy}>
                <NotificationSettingsForm
                  projectId={props.project.id}
                  editable={permissions.manage}
                  showPolicy={false}
                  channelHref={
                    manager
                      ? sectionPath(settingsPath, "integrations")
                      : undefined
                  }
                />
              </Panel>
            )}
            {/* 자동화 내부는 따로 다시 짜는 중이라 자리만 옮긴다. */}
            {section === "automation" && (
              <AutomationSettings
                project={props.project}
                activeUserIds={new Set(props.candidates.map((user) => user.id))}
                editable={permissions.manage}
              />
            )}
            {section === "intake" && (
              <IntakeFormSettings
                projectId={props.project.id}
                editable={permissions.manage}
              />
            )}
          </Section>
        </div>
      </div>
    </UnsavedChangesGuard>
  );
}

function IntegrationPanels({
  project,
  editable,
}: SettingsProps & { readonly editable: boolean }) {
  const [discordDirty, setDiscordDirty] = useState(false);
  useUnsavedChanges("discord", discordDirty);
  return (
    <>
      <Panel title="GitHub 저장소">
        <RepositorySettings
          projectId={project.id}
          projectKey={project.key}
          disabled={!editable}
        />
      </Panel>
      <Panel title="Discord 채널">
        <DiscordChannelForm
          projectId={project.id}
          membersOnly={project.visibility === "MEMBERS"}
          disabled={!editable}
          onDirtyChange={setDiscordDirty}
        />
      </Panel>
    </>
  );
}
