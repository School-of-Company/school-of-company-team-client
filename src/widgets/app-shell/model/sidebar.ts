export function isSidebarShortcut(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "code"
    | "metaKey"
    | "ctrlKey"
    | "altKey"
    | "shiftKey"
    | "repeat"
    | "isComposing"
    | "defaultPrevented"
  >,
): boolean {
  return (
    event.code === "Backslash" &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat &&
    !event.isComposing &&
    !event.defaultPrevented
  );
}
