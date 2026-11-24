import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/app/providers";
import { sidebarBootScript, themeBootScript } from "@/shared/lib";
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

export const metadata: Metadata = {
  title: "School of Company",
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
        {/* React hoists async script resources; blocking="render" keeps preferences ahead of paint. */}
        <script
          id="appearance-boot"
          async
          blocking="render"
          src={`data:text/javascript,${encodeURIComponent(themeBootScript + sidebarBootScript)}`}
        />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
