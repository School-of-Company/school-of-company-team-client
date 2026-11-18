"use client";
import { TeamBoardPage } from "@/pages/team-board";
import { TaskDetailWorkspace } from "@/pages/task-detail";
export default function Page() {
  return <TeamBoardPage Detail={TaskDetailWorkspace} />;
}
