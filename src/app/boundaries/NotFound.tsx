import Link from "next/link";
import { routes } from "@/shared/config";
import { EmptyState } from "@/shared/ui";

export function NotFound() {
  return (
    <EmptyState
      title="페이지를 찾을 수 없어요"
      description="주소가 변경되었거나 접근할 수 없는 페이지예요."
      action={
        <Link href={routes.home} className="ui-button ui-button-secondary">
          홈으로 이동
        </Link>
      }
    />
  );
}
