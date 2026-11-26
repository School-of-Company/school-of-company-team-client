import { formatDate } from "@/shared/lib";
import { Badge } from "@/shared/ui";
import { resultLabel, type AgentActivity } from "../model/policy";

const dateTime: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  year: undefined,
};

/** MCP 쓰기 도구 기록 표. `showUser` 는 전체 기록(헤드 어드민)에서만 켠다. */
export function AgentActivityTable({
  items,
  showUser,
  caption,
}: {
  readonly items: readonly AgentActivity[];
  readonly showUser: boolean;
  readonly caption: string;
}) {
  return (
    <div className="agent-table-wrap">
      <table className="agent-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">시각</th>
            {showUser && <th scope="col">사용자</th>}
            <th scope="col">도구</th>
            <th scope="col">대상</th>
            <th scope="col">결과</th>
            <th scope="col">인자</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="whitespace-nowrap">
                <time dateTime={item.at}>{formatDate(item.at, dateTime)}</time>
              </td>
              {showUser && <td>{item.user?.name ?? "알 수 없음"}</td>}
              <td>
                <span className="font-mono text-xs">{item.tool}</span>
                <span className="block font-mono text-xs text-muted">
                  {item.tokenPrefix}…
                </span>
              </td>
              <td className="break-all">
                {item.targetRef ?? <span className="text-muted">없음</span>}
              </td>
              <td>
                <Badge
                  className={
                    item.resultCode === "OK" ? "badge-green" : "badge-red"
                  }
                >
                  {resultLabel(item.resultCode)}
                </Badge>
                {item.resultCode !== "OK" && (
                  <span className="block font-mono text-xs text-muted">
                    {item.resultCode}
                  </span>
                )}
              </td>
              <td className="font-mono text-xs break-all text-muted">
                {item.argsSummary}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
