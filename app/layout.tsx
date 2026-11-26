import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { AppearanceBootScript, Providers } from "@/app/providers";
import "@/app/styles/globals.css";

const bodyFont = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "45 920",
  variable: "--font-pretendard",
  display: "swap",
});
const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// 공유 미리보기(app/opengraph-image.png)의 절대 URL 기준. 서버에서만 읽는다.
const siteUrl = process.env.SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: "School of Company",
  openGraph: {
    type: "website",
    siteName: "School of Company",
    title: "School of Company",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      data-theme="light"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${monoFont.variable} h-full overflow-x-clip antialiased`}
    >
      <head>
        <AppearanceBootScript />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
