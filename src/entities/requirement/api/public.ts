import { publicApi } from "@/shared/api";
import { statusTokenHeaders } from "../model/status-token";
import type {
  PublicForm,
  PublicMessage,
  PublicRequirement,
  SubmitRequirement,
} from "../model/types";

const base = "/api/v1/public/intake";

/** 계정 없는 요청자용(3.1절). 상태 토큰은 헤더로만 보낸다(경로·쿼리·로그 금지, D12-8). */
export const publicIntakeApi = {
  form: async (formToken: string) =>
    (
      await publicApi.get<PublicForm>(
        `${base}/forms/${encodeURIComponent(formToken)}`,
      )
    ).data,
  submit: async (formToken: string, body: SubmitRequirement) =>
    (
      await publicApi.post<{ statusToken: string; status: "SUBMITTED" }>(
        `${base}/forms/${encodeURIComponent(formToken)}/submissions`,
        body,
      )
    ).data,
  status: async (token: string) =>
    (
      await publicApi.get<PublicRequirement>(`${base}/status`, {
        headers: statusTokenHeaders(token),
      })
    ).data,
  reply: async (token: string, body: string) =>
    (
      await publicApi.post<PublicMessage>(
        `${base}/status/messages`,
        { body },
        { headers: statusTokenHeaders(token) },
      )
    ).data,
  withdraw: async (token: string) =>
    (
      await publicApi.post<PublicRequirement>(`${base}/status/withdraw`, null, {
        headers: statusTokenHeaders(token),
      })
    ).data,
};
