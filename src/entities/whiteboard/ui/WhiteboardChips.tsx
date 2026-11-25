import Link from "next/link";
import { routes } from "@/shared/config";
import type { WhiteboardRef } from "../model/types";

/** 업무·문서 상세의 연결된 화이트보드. 연결이 없으면 아무것도 그리지 않는다. */
export function WhiteboardChips({
  whiteboards,
}: {
  readonly whiteboards: readonly WhiteboardRef[] | undefined;
}) {
  if (!whiteboards?.length) return null;
  return (
    <ul className="whiteboard-chips" aria-label="연결된 화이트보드">
      {whiteboards.map((board) => (
        <li key={board.id}>
          <Link href={routes.whiteboard(board.id)} className="whiteboard-chip">
            {board.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
