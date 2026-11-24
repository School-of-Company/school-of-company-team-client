"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  deleteAvatar,
  discordRequired,
  meQueryKey,
  updateProfile,
  uploadAvatar,
  userAvatarUrl,
  type User,
} from "@/entities/user";
import { AuthGuard, authErrorMessage, OAuthButton } from "@/features/auth";
import { unlinkDiscord } from "../api/unlink-discord";
import { normalizeApiError } from "@/shared/api";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Select,
  ThemeSelect,
} from "@/shared/ui";

// ponytail: fixed list; move to the API when majors need admin editing.
const majors: readonly string[] = [
  "프론트엔드",
  "백엔드",
  "모바일",
  "AI",
  "임베디드",
  "게임",
  "디자인",
  "DevOps",
];

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function AvatarSetting({ user }: { readonly user: User }) {
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const saved = (updated: User) => client.setQueryData(meQueryKey, updated);
  const upload = useMutation({ mutationFn: uploadAvatar, onSuccess: saved });
  const remove = useMutation({ mutationFn: deleteAvatar, onSuccess: saved });
  const pending = upload.isPending || remove.isPending;
  const failure = upload.error ?? remove.error;
  // The API serves its own uploads from a relative path; GitHub photos are absolute.
  const uploaded = !!user.avatarUrl?.startsWith("/");
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar size="lg" name={user.name} src={userAvatarUrl(user)} />
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            remove.reset();
            setTooLarge(file.size > AVATAR_MAX_BYTES);
            if (file.size <= AVATAR_MAX_BYTES) upload.mutate(file);
          }}
        />
        <Button
          variant="secondary"
          loading={upload.isPending}
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          사진 변경
        </Button>
        {uploaded && (
          <Button
            variant="ghost"
            loading={remove.isPending}
            disabled={pending}
            onClick={() => {
              upload.reset();
              setTooLarge(false);
              remove.mutate();
            }}
          >
            GitHub 사진으로 되돌리기
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
        PNG, JPEG, WebP, 2MB 이하. 올리지 않으면 GitHub 프로필 사진을 씁니다.
      </p>
      {(tooLarge || failure) && (
        <p role="alert" className="text-sm text-danger">
          {tooLarge
            ? "2MB 이하 사진만 올릴 수 있습니다."
            : normalizeApiError(failure).message}
        </p>
      )}
    </div>
  );
}

function ProfileForm({ user }: { readonly user: User }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      client.setQueryData(meQueryKey, updated);
      setEditing(false);
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const form = new FormData(event.currentTarget);
    const name = form.get("name");
    const major = form.get("major");
    if (typeof name === "string" && typeof major === "string")
      mutation.mutate({ name: name.trim(), major: major.trim() });
  }
  if (!editing)
    return (
      <div className="grid gap-5">
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="text-muted">이름</dt>
            <dd className="mt-1 break-words">{user.name}</dd>
          </div>
          <div>
            <dt className="text-muted">전공</dt>
            <dd className="mt-1 break-words">
              {user.major || "등록하지 않음"}
            </dd>
          </div>
        </dl>
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={() => {
            mutation.reset();
            setEditing(true);
          }}
        >
          프로필 편집
        </Button>
        {mutation.isSuccess && (
          <p role="status" className="text-sm">
            프로필을 저장했습니다.
          </p>
        )}
      </div>
    );
  return (
    <form onSubmit={submit} className="grid gap-5">
      <Field id="name" label="이름">
        <Input
          id="name"
          name="name"
          defaultValue={user.name}
          required
          maxLength={50}
          pattern=".*\S.*"
          autoComplete="name"
          disabled={mutation.isPending}
        />
      </Field>
      <Field
        id="major"
        label="전공 (선택)"
        hint="전공은 권한과 관계없는 프로필 정보입니다."
      >
        <Select
          id="major"
          name="major"
          defaultValue={user.major ?? ""}
          aria-describedby="major-hint"
          disabled={mutation.isPending}
        >
          <option value="">선택 안 함</option>
          {/* keep a legacy free-text major selectable so saving doesn't drop it */}
          {user.major && !majors.includes(user.major) && (
            <option value={user.major}>{user.major}</option>
          )}
          {majors.map((major) => (
            <option key={major} value={major}>
              {major}
            </option>
          ))}
        </Select>
      </Field>
      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {authErrorMessage(mutation.error)}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          className="justify-self-start"
          loading={mutation.isPending}
        >
          프로필 저장
        </Button>
        <Button
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => setEditing(false)}
        >
          취소
        </Button>
      </div>
    </form>
  );
}

function AccountContent({ user }: { readonly user: User }) {
  const client = useQueryClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const unlink = useMutation({
    mutationFn: unlinkDiscord,
    onSuccess: () => {
      client.clear();
      router.replace("/connect-discord");
    },
  });
  return (
    <div className="settings-page mx-auto grid w-full max-w-3xl min-w-0 gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted">
          프로필과 로그인, 알림 계정을 관리합니다.
        </p>
      </header>
      <section aria-labelledby="profile-title" className="grid gap-5">
        <h2 id="profile-title" className="text-lg font-semibold">
          프로필
        </h2>
        <AvatarSetting user={user} />
        <ProfileForm user={user} />
      </section>
      <section
        aria-labelledby="github-title"
        className="grid gap-4 border-t border-border pt-8"
      >
        <h2 id="github-title" className="text-lg font-semibold">
          GitHub 계정
        </h2>
        <p className="text-sm text-muted">
          GitHub 계정은 로그인에 사용합니다. 프로젝트 저장소 접근은 별도의
          GitHub App 설치와 저장소 권한이 필요합니다.
        </p>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted">사용자명</dt>
            <dd className="break-all">
              {user.githubLogin ?? "연결 정보 없음"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">GitHub ID</dt>
            <dd>{user.githubId ?? "연결 정보 없음"}</dd>
          </div>
        </dl>
      </section>
      <section
        aria-labelledby="discord-title"
        className="grid gap-4 border-t border-border pt-8"
      >
        <h2 id="discord-title" className="text-lg font-semibold">
          Discord 계정
        </h2>
        <div>
          <Badge>
            {user.discordLinked
              ? "연결됨"
              : discordRequired(user)
                ? "연결 필요"
                : "연결 안 됨"}
          </Badge>
        </div>
        <p className="text-sm break-all">
          {user.discordUsername ?? "연결된 계정 없음"}
        </p>
        {user.discordLinked ? (
          <Button
            variant="danger"
            className="justify-self-start"
            onClick={() => setConfirming(true)}
          >
            Discord 연결 해제
          </Button>
        ) : (
          <OAuthButton provider="discord" />
        )}
      </section>
      <section
        aria-labelledby="appearance-title"
        className="grid gap-4 border-t border-border pt-8"
      >
        <h2 id="appearance-title" className="text-lg font-semibold">
          화면 테마
        </h2>
        <p className="text-sm text-muted">
          시스템을 고르면 기기 설정을 따라 자동으로 바뀝니다.
        </p>
        <ThemeSelect />
      </section>
      <Dialog
        open={confirming}
        onClose={() => {
          if (!unlink.isPending) setConfirming(false);
        }}
        title="Discord 연결을 해제할까요?"
      >
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-muted">
            기존 업무와 기록은 보존됩니다. 다시 연결할 때까지 업무 기능을 이용할
            수 없습니다.
          </p>
          {unlink.isError && (
            <p role="alert" className="text-sm text-danger">
              {authErrorMessage(unlink.error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              disabled={unlink.isPending}
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={unlink.isPending}
              onClick={() => {
                if (!unlink.isPending) unlink.mutate();
              }}
            >
              연결 해제
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function AccountPage() {
  return (
    <AuthGuard require="account">
      {(user) => <AccountContent user={user} />}
    </AuthGuard>
  );
}
