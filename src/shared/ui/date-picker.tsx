"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  addDays,
  addMonths,
  clampDate,
  fromSeoulDateTime,
  isOutOfRange,
  monthGrid,
  todayIso,
  toSeoulDateTime,
  weekday,
} from "@/shared/lib";
import { Icon } from "./icons";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"] as const;

const parts = (iso: string) =>
  iso.split("-").map(Number) as [number, number, number];
/** "2026년 11월 24일 화요일" */
const spokenDate = (iso: string) => {
  const [year, month, day] = parts(iso);
  return `${year}년 ${month}월 ${day}일 ${weekdays[weekday(iso)]}요일`;
};
/** "2026년 11월 24일 (화)" */
const shownDate = (iso: string) => {
  const [year, month, day] = parts(iso);
  return `${year}년 ${month}월 ${day}일 (${weekdays[weekday(iso)]})`;
};

/**
 * 달력 팝오버로 고르는 날짜 입력. 값은 YYYY-MM-DD 문자열이고 `name` 이 있으면 폼에 함께 실린다.
 * min, max 밖의 날은 고를 수 없지만, 이미 들어 있는 값은 범위 밖이어도 그대로 보여 준다(수정 화면의 지난 마감일).
 * 키보드: 화살표 하루, 한 주, Home/End 주의 처음, 끝, PageUp/PageDown 한 달(Shift 는 한 해), Enter, Space 선택, Esc 닫기.
 */
export function DatePicker({
  id,
  name,
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "날짜 선택",
  disabled = false,
  invalid = false,
  describedBy,
}: {
  readonly id: string;
  readonly name?: string;
  /** 달력 대화상자와 버튼의 이름(예: "마감일"). */
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: string;
  readonly max?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** 안내 문구 등 함께 읽을 요소 id. 오류(`${id}-error`)는 invalid 일 때 알아서 붙는다. */
  readonly describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(value || todayIso());
  const [place, setPlace] = useState<CSSProperties>({ visibility: "hidden" });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const titleId = useId();
  const today = todayIso();
  const bounds = { min, max };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);
  // 달력은 화면 기준(fixed)으로 띄워 대화상자 스크롤 영역에 잘리지 않고, 대화상자를 스크롤하지도 않는다.
  // 아래 공간이 모자라면 위로, 오른쪽이 모자라면 화면 안쪽으로 붙인다. 스크롤하거나 창 크기가 바뀌면 다시 맞춘다.
  useLayoutEffect(() => {
    if (!open) return;
    const gap = 6;
    const edge = 16;
    const reposition = () => {
      const box = trigger.current?.getBoundingClientRect();
      const panel = popover.current;
      if (!box || !panel) return;
      const { innerWidth, innerHeight } = window;
      const left = Math.max(
        edge,
        Math.min(box.left, innerWidth - edge - panel.offsetWidth),
      );
      const fitsBelow =
        box.bottom + gap + panel.offsetHeight <= innerHeight - edge;
      const fitsAbove = box.top - gap - panel.offsetHeight >= edge;
      setPlace({
        left,
        top:
          fitsBelow || !fitsAbove
            ? box.bottom + gap
            : box.top - gap - panel.offsetHeight,
      });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    popover.current
      ?.querySelector<HTMLElement>(`[data-date="${focus}"]`)
      ?.focus();
  }, [open, focus]);

  function show() {
    setPlace({ visibility: "hidden" });
    moveFocus.current = true;
    setFocus(clampDate(value || today, bounds));
    setOpen(true);
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function pick(iso: string) {
    if (isOutOfRange(iso, bounds)) return;
    onChange(iso);
    close();
  }
  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -weekday(focus)),
      End: () => addDays(focus, 6 - weekday(focus)),
      PageUp: () => addMonths(focus, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focus, event.shiftKey ? 12 : 1),
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      moveFocus.current = true;
      setFocus(step());
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(focus);
    }
  }
  function onPopoverKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      // 대화상자 안에서 열렸을 때 바깥 대화상자까지 닫히지 않게 한다.
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    // 팝오버 안에서만 Tab 이 돈다.
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not(:disabled)",
      ),
    ).filter((item) => item.tabIndex >= 0);
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  const month = focus.slice(0, 7);
  const [year, monthNumber] = parts(focus);
  const prevMonth = addMonths(focus, -1);
  const nextMonth = addMonths(focus, 1);
  const canPrev = !min || prevMonth.slice(0, 7) >= min.slice(0, 7);
  const canNext = !max || nextMonth.slice(0, 7) <= max.slice(0, 7);
  const days = monthGrid(focus);
  return (
    <div ref={root} className="ui-date-picker">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={trigger}
        id={id}
        type="button"
        className="ui-input ui-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={invalid || undefined}
        aria-describedby={describe(id, invalid, describedBy)}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            show();
          }
        }}
      >
        <Icon name="calendar" width={18} height={18} />
        <span className={value ? "" : "text-muted"}>
          {value ? shownDate(value) : placeholder}
        </span>
        {value && <span className="sr-only">{label} 바꾸기</span>}
      </button>
      {open && (
        <div
          ref={popover}
          role="dialog"
          aria-modal="true"
          aria-label={`${label} 선택`}
          className="ui-date-popover"
          style={place}
          onKeyDown={onPopoverKey}
        >
          <div className="ui-date-head">
            <button
              type="button"
              className="ui-date-nav"
              aria-label="이전 달"
              disabled={!canPrev}
              onClick={() => setFocus(clampDate(prevMonth, bounds))}
            >
              <Icon name="chevronLeft" width={16} height={16} />
            </button>
            <p id={titleId} aria-live="polite" className="ui-date-title">
              {year}년 {monthNumber}월
            </p>
            <button
              type="button"
              className="ui-date-nav"
              aria-label="다음 달"
              disabled={!canNext}
              onClick={() => setFocus(clampDate(nextMonth, bounds))}
            >
              <Icon
                name="chevronLeft"
                width={16}
                height={16}
                className="rotate-180"
              />
            </button>
          </div>
          <div
            role="grid"
            aria-labelledby={titleId}
            className="ui-date-grid"
            onKeyDown={onGridKey}
          >
            <div role="row" className="ui-date-row">
              {weekdays.map((day) => (
                <span
                  key={day}
                  role="columnheader"
                  aria-label={`${day}요일`}
                  className="ui-date-weekday"
                >
                  {day}
                </span>
              ))}
            </div>
            {[0, 1, 2, 3, 4, 5].map((week) => (
              <div key={week} role="row" className="ui-date-row">
                {days.slice(week * 7, week * 7 + 7).map((day) => {
                  const off = isOutOfRange(day, bounds);
                  return (
                    <span
                      key={day}
                      role="gridcell"
                      aria-selected={day === value}
                    >
                      <button
                        type="button"
                        data-date={day}
                        className="ui-date-day"
                        tabIndex={day === focus ? 0 : -1}
                        aria-label={
                          spokenDate(day) +
                          (day === today ? ", 오늘" : "") +
                          (off ? ", 선택할 수 없음" : "")
                        }
                        aria-current={day === today ? "date" : undefined}
                        aria-disabled={off || undefined}
                        data-outside={day.slice(0, 7) !== month || undefined}
                        onClick={() => {
                          setFocus(day);
                          pick(day);
                        }}
                      >
                        {Number(day.slice(8))}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="ui-date-foot">
            <button
              type="button"
              className="ui-button ui-button-ghost ui-button-sm"
              disabled={isOutOfRange(today, bounds)}
              onClick={() => pick(today)}
            >
              오늘
            </button>
            {value && (
              <button
                type="button"
                className="ui-button ui-button-ghost ui-button-sm"
                onClick={() => {
                  onChange("");
                  close();
                }}
              >
                지우기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const describe = (id: string, invalid: boolean, extra?: string) =>
  [invalid && `${id}-error`, extra].filter(Boolean).join(" ") || undefined;

/**
 * 날짜는 DatePicker, 시각은 시각 칸으로 고르는 입력. 값과 `min`, `max` 는 ISO 시각(UTC)이고 비었으면 "" 이다.
 * 화면의 날짜와 시각은 다른 화면과 같이 Asia/Seoul 기준이라 브라우저 시간대가 달라도 같은 값을 보이고 보낸다.
 * 날짜를 고르면 `defaultTime`(기본은 지금 서울 시각)을 붙이고, 날짜를 지우면 시각도 지운다. 시각 칸은 날짜가 있어야 쓸 수 있다.
 */
export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  defaultTime,
  invalid = false,
  describedBy,
}: {
  readonly id: string;
  /** 칸 이름(예: "변경 시각"). 끝의 "시각"은 떼고 "날짜", "시각"을 붙여 두 칸의 이름으로 쓴다. */
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: string;
  readonly max?: string;
  readonly defaultTime?: string;
  readonly invalid?: boolean;
  /** 안내 문구 등 함께 읽을 요소 id. */
  readonly describedBy?: string;
}) {
  const local = toSeoulDateTime(value);
  const date = local.slice(0, 10);
  const time = local.slice(11, 16);
  const minLocal = toSeoulDateTime(min);
  const maxLocal = toSeoulDateTime(max);
  const name = label.replace(/\s*시각$/, "");
  const fallback = () =>
    defaultTime ?? toSeoulDateTime(new Date().toISOString()).slice(11, 16);
  return (
    <div className="ui-date-time">
      <DatePicker
        id={id}
        label={`${name} 날짜`}
        value={date}
        min={minLocal.slice(0, 10) || undefined}
        max={maxLocal.slice(0, 10) || undefined}
        invalid={invalid}
        describedBy={describedBy}
        onChange={(next) =>
          onChange(next ? fromSeoulDateTime(next, time || fallback()) : "")
        }
      />
      <input
        id={`${id}-time`}
        type="time"
        className="ui-input"
        aria-label={`${name} 시각`}
        aria-invalid={invalid || undefined}
        aria-describedby={describe(id, invalid, describedBy)}
        disabled={!date}
        value={time}
        min={
          date && date === minLocal.slice(0, 10)
            ? minLocal.slice(11)
            : undefined
        }
        max={
          date && date === maxLocal.slice(0, 10)
            ? maxLocal.slice(11)
            : undefined
        }
        onChange={(event) =>
          onChange(fromSeoulDateTime(date, event.target.value || fallback()))
        }
      />
    </div>
  );
}
