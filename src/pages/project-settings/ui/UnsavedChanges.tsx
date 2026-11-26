"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button, Dialog } from "@/shared/ui";
import { guardedHref } from "../model/leave-guard";

const UnsavedContext = createContext<(key: string, dirty: boolean) => void>(
  () => {},
);

/** 패널이 저장하지 않은 변경을 알린다. 언마운트하면 지운다. */
export function useUnsavedChanges(key: string, dirty: boolean) {
  const report = useContext(UnsavedContext);
  useEffect(() => {
    report(key, dirty);
    return () => report(key, false);
  }, [report, key, dirty]);
}

/**
 * 저장하지 않은 변경이 있으면 새로고침/닫기(beforeunload)와 앱 안 링크 이동을 붙잡는다.
 * ponytail: 뒤로 가기(popstate)는 막지 않는다. App Router 에 이동 차단 API 가 생기면 그쪽으로 옮긴다.
 */
export function UnsavedChangesGuard({
  children,
}: {
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const [dirtyKeys, setDirtyKeys] = useState<ReadonlySet<string>>(new Set());
  const [leaving, setLeaving] = useState<string | null>(null);
  const report = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((keys) => {
      if (keys.has(key) === dirty) return keys;
      const next = new Set(keys);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const dirty = dirtyKeys.size > 0;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // 캡처 단계라 Next Link 의 클릭 처리(React 루트)보다 먼저 받는다.
    const click = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor) return;
      const href = guardedHref(
        event,
        {
          href: anchor.href,
          target: anchor.target,
          download: anchor.hasAttribute("download"),
        },
        window.location.href,
      );
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaving(href);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  return (
    <UnsavedContext value={report}>
      {children}
      <Dialog
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        title="저장하지 않은 변경사항이 있어요"
      >
        <p className="mb-6 text-sm text-foreground-2">
          이 화면을 나가면 바꾼 내용이 사라져요.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setLeaving(null)}>
            계속 편집
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const href = leaving;
              setDirtyKeys(new Set());
              setLeaving(null);
              if (href) router.push(href);
            }}
          >
            나가기
          </Button>
        </div>
      </Dialog>
    </UnsavedContext>
  );
}
