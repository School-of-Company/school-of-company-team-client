import {
  incidentSeverities,
  incidentStatusLabels,
  severityLabels,
  timelineKindLabels,
  type TimelineEntry,
  type IncidentDetail,
  type PostmortemSections,
} from "./types";

const severityNames: Readonly<Record<string, string>> = severityLabels;
const statusNames: Readonly<Record<string, string>> = incidentStatusLabels;
const draftTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function timelineEntryText(
  entry: Pick<TimelineEntry, "kind" | "body">,
): string {
  switch (entry.kind) {
    case "CREATED":
      return entry.body.replace(
        /^(?:사고|장애) 등록: (SEV[123]), (?:커맨더|대응 책임자) ([\s\S]*)$/,
        (_match, severity: string, name: string) =>
          `장애 등록: ${severityNames[severity]}, 대응 책임자 ${name}`,
      );
    case "SEVERITY":
      return entry.body.replace(
        /^심각도 (SEV[123]) → (SEV[123])$/,
        (_match, before: string, after: string) =>
          `심각도 ${severityNames[before]} → ${severityNames[after]}`,
      );
    case "COMMANDER":
      return entry.body.replace(/^커맨더 /, "대응 책임자 ");
    case "STATUS":
      return entry.body.replace(
        /^상태 (OPEN|MITIGATED|RESOLVED) → (OPEN|MITIGATED|RESOLVED)(:[\s\S]*)?$/,
        (_match, before: string, after: string, note: string | undefined) =>
          `상태 ${statusNames[before]} → ${statusNames[after]}${note ?? ""}`,
      );
    case "NOTE":
      return entry.body;
    default: {
      const unhandled: never = entry.kind;
      return unhandled;
    }
  }
}

export function postmortemDisplaySections(
  sections: PostmortemSections,
  incident: Pick<IncidentDetail, "title" | "timeline">,
): PostmortemSections {
  const severity = incidentSeverities.find((value) =>
    sections.summary.startsWith(`${incident.title}. 심각도 ${value}. `),
  );
  const prefixes = new Map<string, string>(
    incident.timeline.map((entry) => {
      const time = draftTime.format(new Date(entry.occurredAt));
      return [
        `- ${time} [${entry.kind}] ${entry.body} — `,
        `- ${time} [${timelineKindLabels[entry.kind]}] ${timelineEntryText(entry)} — `,
      ] as const;
    }),
  );
  const pattern = Array.from(prefixes.keys(), (prefix) =>
    prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  return {
    ...sections,
    summary: severity
      ? `${incident.title}. 심각도 ${severityLabels[severity]}. ${sections.summary.slice(`${incident.title}. 심각도 ${severity}. `.length)}`
      : sections.summary,
    // Match whole entries, including multiline notes, so note text cannot become another event.
    timeline: pattern
      ? sections.timeline.replace(
          new RegExp(`^(${pattern})([^\\n]*)$`, "gm"),
          (_match, prefix: string, author: string) =>
            `${prefixes.get(prefix) ?? prefix}${author}`,
        )
      : sections.timeline,
  };
}
