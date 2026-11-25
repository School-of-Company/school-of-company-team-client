import { useId } from "react";
import type { Sprint } from "@/entities/sprint";
import { percent } from "../model/goal-items";

const states = {
  true: "달성",
  false: "미달성",
  null: "미기록",
} as const;

/** 목표 체크리스트와 달성률. 항목이 없으면 그리지 않는다. */
export function SprintGoalChecklist({ sprint }: { readonly sprint: Sprint }) {
  const headingId = useId();
  if (sprint.goalItems.length === 0) return null;
  const rate = percent(sprint.goalAchievedRate);
  return (
    <section className="grid gap-2" aria-labelledby={headingId}>
      <h3 id={headingId} className="planning-subhead">
        목표 체크리스트{" "}
        <span className="tabular-nums">
          {sprint.status === "CLOSED"
            ? `달성률 ${rate ?? 0}%`
            : "종료할 때 달성을 적어요"}
        </span>
      </h3>
      <ul className="goal-checklist">
        {sprint.goalItems.map((item) => {
          const state = states[String(item.achieved) as keyof typeof states];
          return (
            <li
              key={item.id}
              className="goal-check"
              data-achieved={String(item.achieved)}
            >
              <span className="goal-check-mark" aria-hidden="true" />
              <span className="min-w-0 break-words">{item.text}</span>
              <span className="goal-check-state">{state}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
