"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { meQueryKey, updateProfile, useMe, type User } from "@/entities/user";
import { authErrorMessage, OAuthButton } from "@/features/auth";
import { unlinkDiscord } from "../api/unlink-discord";
import {
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Spinner,
  useToast,
} from "@/shared/ui";

function ProfileForm({ user }: { readonly user: User }) {
  const client = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      client.setQueryData(meQueryKey, updated);
      toast("프로필을 저장했습니다.");
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
        hint="전공은 권한과 관계없는 프로필 정보입니다. 비워두면 삭제됩니다."
      >
        <Input
          id="major"
          name="major"
          defaultValue={user.major ?? ""}
          maxLength={50}
          aria-describedby="major-hint"
          disabled={mutation.isPending}
        />
      </Field>
      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {authErrorMessage(mutation.error)}
        </p>
      )}
      <Button
        type="submit"
        className="justify-self-start"
        loading={mutation.isPending}
      >
        프로필 저장
      </Button>
    </form>
  );
}

export function AccountPage() {
  const me = useMe();
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
  const user = me.data;
  if (!user) return <Spinner label="내 계정 불러오는 중" />;
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-10">
      <h1 className="text-2xl font-bold tracking-tight">내 계정</h1>
      <section aria-labelledby="profile-title" className="grid gap-5">
        <h2 id="profile-title" className="text-lg font-semibold">
          프로필
        </h2>
        <ProfileForm user={user} />
      </section>
      <section
        aria-labelledby="github-title"
        className="grid gap-4 border-t border-border pt-8"
      >
        <h2 id="github-title" className="text-lg font-semibold">
          GitHub 계정
        </h2>
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
          <Badge>{user.discordLinked ? "연결됨" : "연결 필요"}</Badge>
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
