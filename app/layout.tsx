import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  title: "School of Company",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
