import Image from "next/image";

/**
 * The official logo, unedited. The PNG has an opaque white ground, so it sits on a
 * white tile in both themes instead of showing a stray white square in dark mode.
 * ponytail: swap to a transparent export of the official logo when one exists, then drop the tile.
 */
export function BrandMark({
  size = 28,
  label = false,
}: {
  readonly size?: number;
  readonly label?: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="ui-brand-tile" style={{ width: size, height: size }}>
        <Image
          src="/brand/school-of-company-logo.png"
          alt={label ? "" : "School of Company"}
          width={size}
          height={size}
          priority
        />
      </span>
      {label ? (
        <span className="truncate font-bold tracking-tight">
          School of Company
        </span>
      ) : null}
    </span>
  );
}
