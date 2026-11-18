import type { ReactNode } from "react";

export function IdentityPanel({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 sm:p-8">
        <p className="mb-8 text-sm font-semibold text-muted">Engineering Hub</p>
        <h1 className="mb-4 text-2xl font-bold tracking-tight">{title}</h1>
        <div className="grid gap-6">{children}</div>
      </section>
    </main>
  );
}
