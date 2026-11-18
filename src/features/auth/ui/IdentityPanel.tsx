import type { ReactNode } from "react";
import { BrandMark, ThemeToggle } from "@/shared/ui";

/**
 * Shared frame for the sign-in flow screens (login, pending, Discord link, OAuth callback):
 * plain ground with one broad brand-pink glow at the top, a large left-aligned headline,
 * and the content in a readable column below it. No card.
 */
export function IdentityPanel({
  title,
  lead,
  children,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="ui-identity flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-10">
        <span className="min-w-0 text-[0.9375rem]">
          <BrandMark size={32} label />
        </span>
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-[min(18vh,10rem)] pb-20 sm:px-10">
        <h1 className="ui-identity-title">{title}</h1>
        {lead ? <p className="ui-identity-lead">{lead}</p> : null}
        <div className="mt-10 grid max-w-3xl gap-6">{children}</div>
      </main>
    </div>
  );
}
