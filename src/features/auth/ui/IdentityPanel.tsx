import type { ReactNode } from "react";
import { BrandMark, ThemeToggle } from "@/shared/ui";

/**
 * Shared frame for the sign-in flow screens (login, pending, Discord link, OAuth callback).
 * Internal tool: no marketing copy — the brand, a short task title and the action, compact and centred.
 */
export function IdentityPanel({
  title,
  children,
  variant = "default",
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly variant?: "default" | "login";
}) {
  return (
    <div
      className={`ui-identity ui-identity-${variant} relative grid min-h-dvh place-items-center px-5 py-10`}
    >
      <div className="absolute top-4 right-4 z-10 sm:top-5 sm:right-6">
        <ThemeToggle />
      </div>
      <main className="relative z-10 grid w-full max-w-[22rem] justify-items-center text-center">
        <BrandMark size={44} />
        <p className="mt-5 text-sm font-medium text-muted">School of Company</p>
        <h1 className="mt-1 text-[1.625rem] leading-tight font-bold tracking-[-0.02em]">
          {title}
        </h1>
        <div className="mt-7 grid w-full gap-4">{children}</div>
      </main>
    </div>
  );
}
