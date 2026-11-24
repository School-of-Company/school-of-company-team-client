import type { Metadata } from "next";

// 공개 접수 경로(로그인·앱 셸 없음). 양식 토큰이 담긴 주소가 외부 링크의 Referer 로 새지 않게 하고 검색에 올리지 않는다.
export const metadata: Metadata = {
  title: "요구사항 접수 · School of Company",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function IntakeLayout({ children }: LayoutProps<"/intake">) {
  return (
    <main className="mx-auto grid w-full max-w-2xl min-w-0 gap-8 px-4 py-10 [overflow-wrap:anywhere] break-keep">
      {children}
    </main>
  );
}
