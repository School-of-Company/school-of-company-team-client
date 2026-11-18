import { Checkbox } from "@/shared/ui";

export function TaskAssignees({
  people,
  selected,
  onChange,
}: {
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly selected: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">
        담당자 (복수 선택 · 비우면 미지정)
      </legend>
      {people.length === 0 && (
        <p className="text-sm text-muted">선택할 수 있는 담당자가 없습니다.</p>
      )}
      {people.map((person) => (
        <label key={person.id} className="flex min-h-11 items-center gap-3">
          <Checkbox
            checked={selected.includes(person.id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, person.id]
                  : selected.filter((id) => id !== person.id),
              )
            }
          />
          {person.name}
        </label>
      ))}
    </fieldset>
  );
}
