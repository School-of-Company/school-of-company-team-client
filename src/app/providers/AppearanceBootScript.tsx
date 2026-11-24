"use client";

import { sidebarBootScript, themeBootScript } from "@/shared/lib";

export function AppearanceBootScript() {
  return (
    <script
      id="appearance-boot"
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeBootScript + sidebarBootScript }}
    />
  );
}
