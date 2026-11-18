import { redirect } from "next/navigation";
import { routes } from "@/shared/config";

export function EntryPage() {
  redirect(routes.me);
}
