"use client";

import {
  formatDateTime,
  incidentErrorMessage,
  timelineKindLabels,
  timelineEntryText,
  type IncidentDetail,
} from "@/entities/incident";
import { TimelineNoteForm, useRemoveNote } from "@/features/manage-incident";
import { IconButton, Icon } from "@/shared/ui";

/** 시각 오름차순(같으면 id). 서버 기록(등록·상태·심각도·커맨더)은 지울 수 없고 메모만 지운다(D7-4). */
export function IncidentTimeline({
  incident,
}: {
  readonly incident: IncidentDetail;
}) {
  const remove = useRemoveNote(incident.id);
  return (
    <>
      {incident.summary && (
        <section aria-label="요약">
          <p className="text-md break-words whitespace-pre-wrap">
            {incident.summary}
          </p>
        </section>
      )}
      <section aria-labelledby="incident-timeline" className="grid gap-4">
        <h2 id="incident-timeline" className="text-md font-semibold">
          타임라인{" "}
          <span className="text-sm font-normal text-muted tabular-nums">
            {incident.timeline.length}
          </span>
        </h2>
        <ol className="incident-timeline">
          {incident.timeline.map((entry) => (
            <li
              key={entry.id}
              className="incident-entry"
              data-kind={entry.kind}
            >
              <span className="incident-entry-marker" aria-hidden="true" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <time
                    dateTime={entry.occurredAt}
                    className="text-sm tabular-nums"
                  >
                    {formatDateTime(entry.occurredAt)}
                  </time>
                  <span className="incident-entry-kind">
                    {timelineKindLabels[entry.kind]}
                  </span>
                  <span className="text-xs text-muted">
                    {entry.author?.name ?? "알 수 없음"}
                  </span>
                </p>
                <p className="mt-1 break-words whitespace-pre-wrap">
                  {timelineEntryText(entry)}
                </p>
              </div>
              {entry.canDelete && (
                <IconButton
                  aria-label={`${formatDateTime(entry.occurredAt)} 메모 삭제`}
                  variant="ghost"
                  className="ui-button-sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (!remove.isPending) remove.mutate(entry.id);
                  }}
                >
                  <Icon name="close" width={16} height={16} />
                </IconButton>
              )}
            </li>
          ))}
        </ol>
        {remove.error ? (
          <p role="alert" className="text-sm text-danger">
            {incidentErrorMessage(remove.error)}
          </p>
        ) : null}
        <TimelineNoteForm incidentId={incident.id} />
      </section>
    </>
  );
}
