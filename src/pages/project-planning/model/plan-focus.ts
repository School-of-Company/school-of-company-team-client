type FocusTarget = { focus: (options?: FocusOptions) => void };

export function restorePlanFocus(
  previous: unknown,
  target: FocusTarget | null,
  doc: { readonly activeElement: unknown; readonly body: unknown } = document,
) {
  if (doc.activeElement !== doc.body && doc.activeElement !== previous)
    return null;
  target?.focus({ preventScroll: true });
  return target;
}
