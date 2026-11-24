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

const GROUP_KEY = "soc.sidebar.group.";

/** `html[data-sidebar-closed]` 값(공백으로 나눈 묶음 이름)에서 한 묶음의 접힘만 바꾼다. */
export function withGroupClosed(
  current: string | undefined,
  group: string,
  closed: boolean,
): string {
  const groups = new Set((current ?? "").split(" ").filter(Boolean));
  if (closed) groups.add(group);
  else groups.delete(group);
  return [...groups].join(" ");
}

/** 저장된 접힘 값으로 `html[data-sidebar-closed]` 값을 다시 만든다(다른 탭에서 바꾼 경우). */
export function closedGroupsFromStorage(
  storage: Pick<Storage, "length" | "key" | "getItem">,
): string {
  const groups: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(GROUP_KEY) && storage.getItem(key) === "true")
      groups.push(key.slice(GROUP_KEY.length));
  }
  return groups.join(" ");
}
