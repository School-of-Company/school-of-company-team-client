import Link from "next/link";

/** Segmented control whose options are pages (e.g. 목록 / 보드 views of one screen). */
export function SegmentedLinks({
  label,
  items,
}: {
  readonly label: string;
  readonly items: readonly {
    readonly href: string;
    readonly label: string;
    readonly active: boolean;
  }[];
}) {
  return (
    <nav aria-label={label} className="ui-segmented">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className="ui-segmented-option"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
