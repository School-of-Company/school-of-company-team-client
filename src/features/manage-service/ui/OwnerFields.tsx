"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { activeUsersQueryOptions } from "@/entities/user";
import { Checkbox, Field, Select, Spinner } from "@/shared/ui";

export type OwnerSelection = {
  readonly primary: string;
  readonly secondary: readonly string[];
};

/** 주 소유자 한 명 + 부 소유자 여러 명. 후보는 활성 사용자, 지금 소유자 중 비활성인 사람은 교체를 위해 그대로 보여 준다. */
export function OwnerFields({
  value,
  onChange,
  disabled,
  error,
  current = [],
}: {
  readonly value: OwnerSelection;
  readonly onChange: (value: OwnerSelection) => void;
  readonly disabled: boolean;
  readonly error?: string;
  readonly current?: readonly {
    readonly userId: string;
    readonly name: string;
    readonly active: boolean;
  }[];
}) {
  const id = useId();
  const users = useQuery(activeUsersQueryOptions());
  if (users.isPending) return <Spinner label="팀원 불러오는 중" />;
  if (users.isError)
    return (
      <p role="alert" className="text-sm text-danger">
        팀원 목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.
      </p>
    );
  const candidates = [
    ...users.data.map((user) => ({
      id: user.id,
      name: user.name,
      active: true,
    })),
    ...current
      .filter((owner) => !users.data.some((user) => user.id === owner.userId))
      .map((owner) => ({
        id: owner.userId,
        name: owner.name,
        active: owner.active,
      })),
  ];
  const label = (person: { name: string; active: boolean }) =>
    person.active ? person.name : `${person.name} (비활성)`;
  return (
    <>
      <Field id={`${id}-primary`} label="주 소유자" error={error}>
        <Select
          id={`${id}-primary`}
          required
          disabled={disabled}
          value={value.primary}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-primary-error` : undefined}
          onChange={(event) =>
            onChange({
              primary: event.target.value,
              secondary: value.secondary.filter(
                (userId) => userId !== event.target.value,
              ),
            })
          }
        >
          <option value="" disabled>
            팀원 선택
          </option>
          {candidates.map((person) => (
            <option key={person.id} value={person.id}>
              {label(person)}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium">부 소유자</legend>
        <div className="service-owner-options">
          {candidates
            .filter((person) => person.id !== value.primary)
            .map((person) => (
              <label
                key={person.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={value.secondary.includes(person.id)}
                  onChange={(event) =>
                    onChange({
                      primary: value.primary,
                      secondary: event.target.checked
                        ? [...value.secondary, person.id]
                        : value.secondary.filter(
                            (userId) => userId !== person.id,
                          ),
                    })
                  }
                />
                {label(person)}
              </label>
            ))}
        </div>
      </fieldset>
    </>
  );
}
