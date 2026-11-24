export function sidebarProjects<
  T extends {
    readonly id: string;
    readonly key: string;
    readonly name: string;
  },
>(
  projects: readonly T[],
  recent: readonly string[],
  filter: string,
): readonly T[] {
  const query = filter.trim().toLocaleLowerCase();
  if (query)
    return projects.filter((project) =>
      `${project.name} ${project.key}`.toLocaleLowerCase().includes(query),
    );
  const ordered = [...projects].sort((a, b) => {
    const aIndex = recent.indexOf(a.id);
    const bIndex = recent.indexOf(b.id);
    return (
      (aIndex < 0 ? recent.length : aIndex) -
      (bIndex < 0 ? recent.length : bIndex)
    );
  });
  return ordered.slice(0, 7);
}

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
