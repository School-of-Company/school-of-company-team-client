"use client";

import { useState, type FormEvent } from "react";
import {
  serviceApi,
  serviceErrorMessage,
  serviceTiers,
  tierDescriptions,
  tierLabels,
  type ServiceDetail,
  type ServiceTier,
} from "@/entities/service";
import { Button, Dialog, Field, Input, Select, Textarea } from "@/shared/ui";
import { useServiceMutation } from "../api/mutations";
import {
  validateServiceForm,
  type ServiceFormErrors,
} from "../model/validation";
import { OwnerFields, type OwnerSelection } from "./OwnerFields";

function TierField({
  value,
  onChange,
  disabled,
}: {
  readonly value: ServiceTier;
  readonly onChange: (tier: ServiceTier) => void;
  readonly disabled: boolean;
}) {
  return (
    <Field id="service-tier" label="등급">
      <Select
        id="service-tier"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            serviceTiers.find((tier) => tier === event.target.value) ?? "TIER3",
          )
        }
      >
        {serviceTiers.map((tier) => (
          <option key={tier} value={tier}>
            {tierLabels[tier]} ({tierDescriptions[tier]})
          </option>
        ))}
      </Select>
    </Field>
  );
}

function FormFooter({
  pending,
  submitLabel,
  error,
  onClose,
}: {
  readonly pending: boolean;
  readonly submitLabel: string;
  readonly error: unknown;
  readonly onClose: () => void;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {serviceErrorMessage(error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          취소
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </>
  );
}

/** 헤드 어드민 전용. 등급 기본값은 3등급(과장하지 않는다, D6-1). */
export function CreateServiceDialog({
  open,
  onClose,
  onCreated,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated: (service: ServiceDetail) => void;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<ServiceTier>("TIER3");
  const [owners, setOwners] = useState<OwnerSelection>({
    primary: "",
    secondary: [],
  });
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const create = useServiceMutation(undefined, serviceApi.create);
  const close = () => {
    if (create.isPending) return;
    create.reset();
    setErrors({});
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    const next = validateServiceForm({
      key,
      name,
      description,
      primaryOwnerId: owners.primary,
    });
    setErrors(next);
    if (Object.keys(next).length) return;
    create.mutate(
      {
        key,
        name: name.trim(),
        description: description.trim() || undefined,
        tier,
        primaryOwnerId: owners.primary,
        secondaryOwnerIds: owners.secondary,
      },
      {
        onSuccess: (service) => {
          setKey("");
          setName("");
          setDescription("");
          setTier("TIER3");
          setOwners({ primary: "", secondary: [] });
          onCreated(service);
        },
      },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="새 서비스"
      className="service-dialog"
    >
      <form noValidate className="grid gap-4" onSubmit={submit}>
        <Field
          id="service-key"
          label="키"
          error={errors.key}
          hint={
            errors.key
              ? undefined
              : "주소와 그래프에 쓰는 불변 이름입니다. 예: team-server"
          }
        >
          <Input
            id="service-key"
            required
            autoComplete="off"
            spellCheck={false}
            value={key}
            disabled={create.isPending}
            aria-invalid={errors.key ? true : undefined}
            aria-describedby={
              errors.key ? "service-key-error" : "service-key-hint"
            }
            onChange={(event) => setKey(event.target.value.trim())}
          />
        </Field>
        <Field id="service-name" label="이름" error={errors.name}>
          <Input
            id="service-name"
            required
            maxLength={100}
            value={name}
            disabled={create.isPending}
            aria-invalid={errors.name ? true : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field id="service-description" label="설명" error={errors.description}>
          <Textarea
            id="service-description"
            maxLength={2000}
            value={description}
            disabled={create.isPending}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <TierField
          value={tier}
          onChange={setTier}
          disabled={create.isPending}
        />
        <OwnerFields
          value={owners}
          onChange={setOwners}
          disabled={create.isPending}
          error={errors.primaryOwnerId}
        />
        <FormFooter
          pending={create.isPending}
          submitLabel="서비스 만들기"
          error={create.error}
          onClose={close}
        />
      </form>
    </Dialog>
  );
}

export function EditServiceDialog({
  service,
  open,
  onClose,
}: {
  readonly service: ServiceDetail;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [tier, setTier] = useState(service.tier);
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const update = useServiceMutation(
    service.id,
    (body: Parameters<typeof serviceApi.update>[1]) =>
      serviceApi.update(service.id, body),
  );
  const close = () => {
    if (update.isPending) return;
    update.reset();
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="서비스 수정"
      className="service-dialog"
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (update.isPending) return;
          const next = validateServiceForm({ name, description });
          setErrors(next);
          if (Object.keys(next).length) return;
          // 빈 설명은 ""로 보내 지운다(계약 4.4).
          update.mutate(
            { name: name.trim(), description: description.trim(), tier },
            { onSuccess: onClose },
          );
        }}
      >
        <Field id="edit-service-name" label="이름" error={errors.name}>
          <Input
            id="edit-service-name"
            required
            maxLength={100}
            value={name}
            disabled={update.isPending}
            aria-invalid={errors.name ? true : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field
          id="edit-service-description"
          label="설명"
          error={errors.description}
        >
          <Textarea
            id="edit-service-description"
            maxLength={2000}
            value={description}
            disabled={update.isPending}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <TierField
          value={tier}
          onChange={setTier}
          disabled={update.isPending}
        />
        <FormFooter
          pending={update.isPending}
          submitLabel="저장"
          error={update.error}
          onClose={close}
        />
      </form>
    </Dialog>
  );
}

export function OwnersDialog({
  service,
  open,
  onClose,
}: {
  readonly service: ServiceDetail;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [owners, setOwners] = useState<OwnerSelection>({
    primary:
      service.owners.find((owner) => owner.role === "PRIMARY")?.userId ?? "",
    secondary: service.owners
      .filter((owner) => owner.role === "SECONDARY")
      .map((owner) => owner.userId),
  });
  const [error, setError] = useState<string>();
  const replace = useServiceMutation(service.id, (selection: OwnerSelection) =>
    serviceApi.replaceOwners(service.id, [
      { userId: selection.primary, role: "PRIMARY" },
      ...selection.secondary.map((userId) => ({
        userId,
        role: "SECONDARY" as const,
      })),
    ]),
  );
  const close = () => {
    if (replace.isPending) return;
    replace.reset();
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="소유자 변경"
      className="service-dialog"
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (replace.isPending) return;
          setError(owners.primary ? undefined : "주 소유자를 고르세요.");
          if (owners.primary) replace.mutate(owners, { onSuccess: onClose });
        }}
      >
        <p className="text-sm text-muted">
          소유자와 헤드 어드민이 이 서비스를 수정할 수 있습니다. 주 소유자는 한
          명입니다.
        </p>
        <OwnerFields
          value={owners}
          onChange={setOwners}
          disabled={replace.isPending}
          error={error}
          current={service.owners}
        />
        <FormFooter
          pending={replace.isPending}
          submitLabel="저장"
          error={replace.error}
          onClose={close}
        />
      </form>
    </Dialog>
  );
}
