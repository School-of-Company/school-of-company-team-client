import type { ReactNode } from "react";
import { BrandMark, ThemeToggle } from "@/shared/ui";

/**
 * Shared frame for the sign-in flow screens (login, pending, Discord link, OAuth callback):
 * a quiet top bar with the brand and the theme switch, then one narrow column.
 */
export function IdentityPanel({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <span className="min-w-0 text-sm">
          <BrandMark size={28} label />
        </span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 justify-center px-5 pt-[min(14vh,8rem)] pb-16">
        <section className="w-full max-w-[25rem]">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight">
            {title}
          </h1>
          <div className="mt-6 grid gap-6">{children}</div>
        </section>
      </main>
    </div>
  );
}
