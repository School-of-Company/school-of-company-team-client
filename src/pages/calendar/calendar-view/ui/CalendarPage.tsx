"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarApi, calendarKeys, calendarQueries } from "../api/calendar";
import {
  CALENDAR_DESCRIPTION_MAX,
  CALENDAR_TITLE_MAX,
  calendarErrorMessage,
  validateCalendarEvent,
  type CalendarEventInput,
  type CalendarItem,
} from "../model/types";
import { projectAccess, projectQueries } from "@/entities/project";
import { seoulToday } from "@/entities/sprint";
import type { User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { fieldErrors, normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  ErrorState,
  Field,
  Icon,
  Input,
  PageSkeleton,
  StaleNotice,
  Textarea,
  useToast,
} from "@/shared/ui";
import { ProjectHeading, ProjectHeadingSkeleton } from "@/widgets/project-nav";
import {
  itemHref,
  itemsOn,
  kindLabel,
  monthGrid,
  shiftMonth,
  shortTime,
} from "../model/month";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
/** 칸에 다 보이는 항목 수. 넘치면 "+N" 으로 그날 목록을 연다. */
const CELL_LIMIT = 3;

/** projectId 가 없으면 팀 달력(`/calendar`), 있으면 프로젝트 탭. 명세: 서버 docs/spec/s11-calendar.md */
export function CalendarPage({ projectId }: { readonly projectId?: string }) {
  return (
    <AuthGuard
      require="work"
      fallback={
        projectId ? (
          <ProjectHeadingSkeleton />
        ) : (
          <PageSkeleton label="달력 불러오는 중" />
        )
      }
    >
      {(user) =>
        projectId ? (
          <ProjectCalendar projectId={projectId} user={user} />
        ) : (
          <Month
            canCreate
            heading={
              <div className="min-w-0">
                <h1>달력</h1>
                {/* 부제는 390폭에서도 한 줄이다(머리 높이가 다른 화면과 같다). */}
                <p className="page-subtitle">일정과 마감</p>
              </div>
            }
          />
        )
      }
    </AuthGuard>
  );
}

function ProjectCalendar({
  projectId,
  user,
}: {
  readonly projectId: string;
  readonly user: User;
}) {
  const project = useQuery(projectQueries.detail(projectId));
  if (project.isPending)
    return <ProjectHeadingSkeleton label="프로젝트 불러오는 중" />;
  if (project.isError)
    return (
      <ErrorState
        description={calendarErrorMessage(normalizeApiError(project.error))}
        onRetry={() => void project.refetch()}
      />
    );
  return (
    <div className="planning-page grid min-w-0 gap-6">
      <ProjectHeading project={project.data} user={user} />
      <Month
        projectId={projectId}
        canCreate={projectAccess(project.data, user).editable}
        heading={<h2 className="text-lg font-semibold">달력</h2>}
      />
    </div>
  );
}

type Editing = { readonly item?: CalendarItem; readonly date: string };

function Month({
  projectId,
  canCreate,
  heading,
}: {
  readonly projectId?: string;
  readonly canCreate: boolean;
  readonly heading: ReactNode;
}) {
  const today = seoulToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const days = monthGrid(month);
  const items = useQuery(calendarQueries.range(days[0], days[41], projectId));
  const [year, monthNumber] = month.split("-").map(Number);
  const label = `${year}년 ${monthNumber}월`;
  const openItem = (item: CalendarItem) => {
    setDay(null);
    setEditing({ item, date: item.startDate });
  };
  return (
    <section className="grid gap-4" aria-label={`${label} 달력`}>
      <div className={projectId ? "planning-section-head" : "page-header"}>
        {heading}
        {canCreate && (
          <Button onClick={() => setEditing({ date: today })}>
            <Icon name="plus" className="inline-block" /> 새 일정
          </Button>
        )}
      </div>
      <div className="calendar-toolbar">
        <h3 className="text-base font-semibold tabular-nums" aria-live="polite">
          {label}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            className="ui-button-sm"
            aria-label="이전 달"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            ‹
          </Button>
          <Button
            variant="secondary"
            className="ui-button-sm"
            onClick={() => setMonth(today.slice(0, 7))}
          >
            오늘
          </Button>
          <Button
            variant="secondary"
            className="ui-button-sm"
            aria-label="다음 달"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            ›
          </Button>
        </div>
      </div>
      <StaleNotice query={items} />
      {items.isError && !items.data ? (
        <ErrorState
          title="달력을 불러오지 못했어요"
          description={calendarErrorMessage(normalizeApiError(items.error))}
          onRetry={() => void items.refetch()}
        />
      ) : (
        // 달을 바꾼 직후에는 이전 달의 일정을 흐리게 두고 새 달을 받으면 바꾼다.
        <div
          className="calendar-grid"
          aria-busy={items.isFetching || undefined}
          data-placeholder={items.isPlaceholderData || undefined}
        >
          {WEEKDAYS.map((name) => (
            <div key={name} className="calendar-weekday" aria-hidden>
              {name}
            </div>
          ))}
          {days.map((date) => {
            const dayItems = itemsOn(items.data ?? [], date);
            const extra = dayItems.length - CELL_LIMIT;
            return (
              <div
                key={date}
                className="calendar-day"
                data-outside={!date.startsWith(month) || undefined}
                data-today={date === today || undefined}
              >
                <button
                  type="button"
                  className="calendar-day-number"
                  aria-label={`${formatDate(date, { weekday: "short" })} 일정 ${dayItems.length}개`}
                  aria-current={date === today ? "date" : undefined}
                  onClick={() => setDay(date)}
                >
                  {Number(date.slice(8))}
                </button>
                {dayItems.slice(0, CELL_LIMIT).map((item) => (
                  <ItemChip
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    onOpen={openItem}
                  />
                ))}
                {extra > 0 && (
                  <button
                    type="button"
                    className="calendar-more"
                    onClick={() => setDay(date)}
                  >
                    +{extra}개
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Dialog
        open={!!day}
        onClose={() => setDay(null)}
        title={day ? formatDate(day, { weekday: "short" }) : ""}
      >
        {day && (
          <div className="grid gap-4">
            {itemsOn(items.data ?? [], day).length === 0 ? (
              <p className="text-sm text-muted">이 날에는 항목이 없어요.</p>
            ) : (
              <ul className="list" aria-label="이 날 항목">
                {itemsOn(items.data ?? [], day).map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="list-row">
                    <span className="list-row-main">
                      <ItemChip item={item} onOpen={openItem} wide />
                    </span>
                    <span className="list-row-meta">
                      <span>{kindLabel[item.kind]}</span>
                      {item.projectKey && <span>{item.projectKey}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canCreate && (
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setEditing({ date: day });
                    setDay(null);
                  }}
                >
                  이 날 일정 추가
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
      {editing && (
        <EventDialog
          key={editing.item?.id ?? `new-${editing.date}`}
          editing={editing}
          projectId={projectId}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function ItemChip({
  item,
  onOpen,
  wide = false,
}: {
  readonly item: CalendarItem;
  readonly onOpen: (item: CalendarItem) => void;
  readonly wide?: boolean;
}) {
  const href = itemHref(item);
  const text = (
    <>
      {item.startTime && (
        <span className="tabular-nums">{shortTime(item.startTime)} </span>
      )}
      {item.taskKey && <span className="tabular-nums">{item.taskKey} </span>}
      {item.title}
      <span className="sr-only"> ({kindLabel[item.kind]})</span>
    </>
  );
  const props = {
    className: "calendar-chip",
    "data-kind": item.kind,
    "data-wide": wide || undefined,
    "data-done":
      item.status === "DONE" || item.status === "CLOSED" || undefined,
    title: item.title,
  };
  return href ? (
    <Link href={href} {...props}>
      {text}
    </Link>
  ) : (
    <button type="button" {...props} onClick={() => onOpen(item)}>
      {text}
    </button>
  );
}

/** 만들기·고치기·보기 한 대화상자. 고칠 수 없는 일정은 내용만 보여 준다. */
function EventDialog({
  editing,
  projectId,
  onClose,
}: {
  readonly editing: Editing;
  readonly projectId?: string;
  readonly onClose: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { item } = editing;
  const [allDay, setAllDay] = useState(!item?.startTime);
  const [startDate, setStartDate] = useState(item?.startDate ?? editing.date);
  const [endDate, setEndDate] = useState(item?.endDate ?? editing.date);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const done = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    toast(message, "success");
    onClose();
  };
  async function run(action: () => Promise<unknown>, message: string) {
    setPending(true);
    try {
      await action();
      done(message);
    } catch (cause) {
      const problem = normalizeApiError(cause);
      setErrors(
        fieldErrors(
          problem,
          [
            "title",
            "description",
            "startDate",
            "endDate",
            "startTime",
            "endTime",
          ],
          calendarErrorMessage(problem),
        ),
      );
      setDeleting(false);
    } finally {
      setPending(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    const input: CalendarEventInput = {
      title: value("title"),
      description: value("description"),
      startDate: value("startDate"),
      endDate: value("endDate"),
      startTime: allDay ? "" : value("startTime"),
      endTime: allDay ? "" : value("endTime"),
    };
    const problems = validateCalendarEvent(input);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    void run(
      () =>
        item
          ? calendarApi.update(item.id, input)
          : calendarApi.create(input, projectId),
      item ? "일정을 고쳤어요." : "일정을 만들었어요.",
    );
  }
  if (item && !item.canEdit)
    return (
      <Dialog open onClose={onClose} title={item.title}>
        <dl className="milestone-facts">
          <div>
            <dt>날짜</dt>
            <dd className="tabular-nums">{rangeText(item)}</dd>
          </div>
          <div>
            <dt>만든 사람</dt>
            <dd>{item.createdBy?.name ?? "알 수 없음"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm whitespace-pre-wrap">
          {item.description ?? "설명이 없어요."}
        </p>
      </Dialog>
    );
  const field = (name: string) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });
  return (
    <Dialog
      open
      onClose={() => !pending && onClose()}
      title={item ? "일정 고치기" : "새 일정"}
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <Field id={`${id}-title`} label="제목 (필수)" error={errors.title}>
          <Input
            {...field("title")}
            defaultValue={item?.title}
            maxLength={CALENDAR_TITLE_MAX}
            required
            autoFocus
            placeholder="주간 회의"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-startDate`} label="시작일" error={errors.startDate}>
            <DatePicker
              id={`${id}-startDate`}
              name="startDate"
              label="시작일"
              value={startDate}
              onChange={setStartDate}
              invalid={!!errors.startDate}
            />
          </Field>
          <Field id={`${id}-endDate`} label="종료일" error={errors.endDate}>
            <DatePicker
              id={`${id}-endDate`}
              name="endDate"
              label="종료일"
              value={endDate}
              onChange={setEndDate}
              min={startDate || undefined}
              invalid={!!errors.endDate}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
          />
          종일
        </label>
        {!allDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${id}-startTime`}
              label="시작 시각"
              error={errors.startTime}
            >
              <Input
                {...field("startTime")}
                type="time"
                defaultValue={shortTime(item?.startTime ?? null) || "10:00"}
              />
            </Field>
            <Field
              id={`${id}-endTime`}
              label="종료 시각"
              error={errors.endTime}
            >
              <Input
                {...field("endTime")}
                type="time"
                defaultValue={shortTime(item?.endTime ?? null) || "11:00"}
              />
            </Field>
          </div>
        )}
        <Field id={`${id}-description`} label="설명" error={errors.description}>
          <Textarea
            {...field("description")}
            defaultValue={item?.description ?? ""}
            maxLength={CALENDAR_DESCRIPTION_MAX}
          />
        </Field>
        {errors.form && (
          <p role="alert" className="text-sm text-danger">
            {errors.form}
          </p>
        )}
        {deleting ? (
          <div
            className="milestone-confirm"
            role="group"
            aria-label="삭제 확인"
          >
            <p className="text-sm">이 일정을 지울까요? 되돌릴 수 없어요.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setDeleting(false)}
              >
                취소
              </Button>
              <Button
                variant="danger"
                loading={pending}
                onClick={() =>
                  void run(
                    () => calendarApi.remove(item!.id),
                    "일정을 지웠어요.",
                  )
                }
              >
                지우기
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {item && (
              <Button
                variant="ghost"
                onClick={() => setDeleting(true)}
                disabled={pending}
              >
                일정 지우기
              </Button>
            )}
            <span className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={onClose} disabled={pending}>
                취소
              </Button>
              <Button type="submit" loading={pending}>
                {item ? "변경 저장" : "일정 만들기"}
              </Button>
            </span>
          </div>
        )}
      </form>
    </Dialog>
  );
}

function rangeText(item: CalendarItem) {
  const start = formatDate(item.startDate, { weekday: "short" });
  const times = item.startTime
    ? ` ${shortTime(item.startTime)}–${shortTime(item.endTime)}`
    : " 종일";
  return item.startDate === item.endDate
    ? `${start}${times}`
    : `${start} ~ ${formatDate(item.endDate, { weekday: "short" })}${times}`;
}
