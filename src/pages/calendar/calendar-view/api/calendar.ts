import { api } from "@/shared/api";
import { keepPreviousKey } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";
import type { CalendarEventInput, CalendarItem } from "../model/types";

export const calendarKeys = {
  all: ["calendar"] as const,
  range: (from: string, to: string, projectId?: string) =>
    ["calendar", projectId ?? "team", from, to] as const,
};

const events = "/api/v1/calendar/events";

function body(input: CalendarEventInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: input.startTime || null,
    endTime: input.endTime || null,
  };
}

export const calendarApi = {
  list: async (from: string, to: string, projectId?: string) =>
    (
      await api.get<readonly CalendarItem[]>("/api/v1/calendar", {
        params: { from, to, ...(projectId ? { projectId } : {}) },
      })
    ).data,
  create: async (input: CalendarEventInput, projectId?: string) =>
    (
      await api.post<CalendarItem>(events, {
        ...body(input),
        projectId: projectId ?? null,
      })
    ).data,
  update: async (id: string, input: CalendarEventInput) =>
    (
      await api.put<CalendarItem>(
        `${events}/${encodeURIComponent(id)}`,
        body(input),
      )
    ).data,
  remove: async (id: string) => {
    await api.delete(`${events}/${encodeURIComponent(id)}`);
  },
};

export const calendarQueries = {
  range: (from: string, to: string, projectId?: string) =>
    queryOptions({
      queryKey: calendarKeys.range(from, to, projectId),
      queryFn: () => calendarApi.list(from, to, projectId),
      // 달을 넘길 때 앞 달을 잠깐 보여 깜빡임을 막는다.
      placeholderData: keepPreviousKey(calendarKeys.range(from, to, projectId)),
      retry: false,
    }),
};
