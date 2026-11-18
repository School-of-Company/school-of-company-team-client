"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "./icons";

export interface ChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Small pill that opens a styled listbox (native <select> menus can't be styled).
 * Keyboard: Enter/Space/ArrowDown opens, arrows move, Home/End jump, Enter selects, Esc/Tab closes.
 */
export function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly ChipOption<T>[];
  readonly onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const current = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    button.current?.focus();
  }
  function onListKey(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    if (event.key === "ArrowDown") setActive((i) => Math.min(last, i + 1));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(last);
    else if (event.key === "Enter" || event.key === " ") choose(active);
    else if (event.key === "Escape") {
      setOpen(false);
      button.current?.focus();
    } else if (event.key === "Tab") setOpen(false);
    else return;
    event.preventDefault();
  }

  return (
    <div ref={root} className="ui-chip-select-root">
      <button
        ref={button}
        type="button"
        className="ui-chip-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current?.label ?? ""}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openList();
          }
        }}
      >
        <span>{current?.label}</span>
        <Icon name="chevronDown" width={14} height={14} />
      </button>
      {open ? (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-opt-${active}`}
          className="ui-chip-menu"
          onKeyDown={onListKey}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === active || undefined}
              className="ui-chip-option"
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <Icon name="check" width={14} height={14} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
