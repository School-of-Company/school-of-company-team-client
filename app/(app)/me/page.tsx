"use client";
import { MyBoardPage } from "@/pages/my-board";
import { TaskDetailWorkspace } from "@/pages/task-detail";
export default function Page() {
  return <MyBoardPage Detail={TaskDetailWorkspace} />;
}
