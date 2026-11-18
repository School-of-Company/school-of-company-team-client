import type { ComponentProps, ReactNode } from "react";

type ButtonProps = ComponentProps<"button"> & {
  readonly variant?: "primary" | "secondary" | "ghost" | "danger";
  readonly loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`ui-button ui-button-${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({
  "aria-label": label,
  ...props
}: ButtonProps & { readonly "aria-label": string }) {
  return (
    <Button
      {...props}
      aria-label={label}
      className={`ui-icon-button ${props.className ?? ""}`}
    />
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`ui-input ${className}`} {...props} />;
}
export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return <textarea className={`ui-input min-h-28 ${className}`} {...props} />;
}
export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`ui-input ${className}`} {...props} />;
}
export function Checkbox({
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={`size-5 accent-brand ${className}`}
      {...props}
    />
  );
}
export function Label(props: ComponentProps<"label">) {
  return (
    <label
      {...props}
      className={`text-sm font-medium ${props.className ?? ""}`}
    />
  );
}
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
