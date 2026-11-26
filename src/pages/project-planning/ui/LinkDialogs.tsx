"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Dialog, Field, Input } from "@/shared/ui";
import { useLinkChange } from "../api/links";
import {
  linkCreateBody,
  linkPatch,
  validateLinkForm,
  type LinkForm,
} from "../model/link-form";
import {
  aspectRatio,
  linkErrorMessage,
  type ProjectLink,
} from "../model/links";

/** 링크 추가·수정. 제목을 비우면 서버가 페이지 제목 → 호스트로 보여 준다. */
export function LinkFormDialog({
  open,
  projectId,
  link,
  onClose,
}: {
  readonly open: boolean;
  readonly projectId: string;
  /** 없으면 새 링크. */
  readonly link?: ProjectLink;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={link ? "링크 수정" : "링크 추가"}
    >
      {open && (
        <LinkFormBody projectId={projectId} link={link} onClose={onClose} />
      )}
    </Dialog>
  );
}

function LinkFormBody({
  projectId,
  link,
  onClose,
}: {
  readonly projectId: string;
  readonly link?: ProjectLink;
  readonly onClose: () => void;
}) {
  const id = useId();
  const save = useLinkChange(projectId);
  const [form, setForm] = useState<LinkForm>({
    url: link?.url ?? "",
    title: link?.customTitle ?? "",
    label: link?.label ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (field: keyof LinkForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const next = validateLinkForm(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!link) {
      save.mutate(
        { action: "create", body: linkCreateBody(form) },
        { onSuccess: onClose },
      );
      return;
    }
    const body = linkPatch(link, form);
    if (!Object.keys(body).length) return onClose();
    save.mutate(
      { action: "update", linkId: link.id, body },
      { onSuccess: onClose },
    );
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field
        id={`${id}-url`}
        label="주소"
        hint="Notion, Figma 같은 종류는 자동으로 알아봐요."
        error={errors.url}
      >
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          value={form.url}
          maxLength={2000}
          required
          autoFocus
          placeholder="https://"
          onChange={(event) => set("url")(event.target.value)}
        />
      </Field>
      <Field
        id={`${id}-title`}
        label="제목"
        hint="비우면 페이지 제목이나 도메인이 보여요."
        error={errors.title}
      >
        <Input
          id={`${id}-title`}
          value={form.title}
          maxLength={100}
          onChange={(event) => set("title")(event.target.value)}
        />
      </Field>
      <Field
        id={`${id}-label`}
        label="라벨"
        hint="예: 배포, 기획, 디자인"
        error={errors.label}
      >
        <Input
          id={`${id}-label`}
          value={form.label}
          maxLength={30}
          onChange={(event) => set("label")(event.target.value)}
        />
      </Field>
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {linkErrorMessage(save.error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={save.isPending} onClick={onClose}>
          취소
        </Button>
        <Button type="submit" loading={save.isPending}>
          {link ? "저장" : "추가"}
        </Button>
      </div>
    </form>
  );
}

/** 미리보기: 연 뒤에만 iframe을 만든다. 로그인·공유 설정 때문에 비어 보일 수 있어 새 탭 열기를 같이 둔다. */
export function LinkPreviewDialog({
  link,
  onClose,
}: {
  readonly link: ProjectLink | null;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      open={!!link?.embed}
      onClose={onClose}
      title={link?.title ?? "미리보기"}
      className="link-preview-dialog"
    >
      {link?.embed && (
        <div className="grid gap-3">
          <div
            className="link-preview-frame"
            style={{ aspectRatio: aspectRatio(link.embed.aspect) }}
          >
            <iframe
              src={link.embed.url}
              title={`${link.title} 미리보기`}
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
              loading="lazy"
              allowFullScreen
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              로그인이나 공유 설정 때문에 비어 보이면 새 탭에서 여세요.
            </p>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-button ui-button-secondary"
            >
              새 탭에서 열기
            </a>
          </div>
        </div>
      )}
    </Dialog>
  );
}
