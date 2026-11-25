"use client";

import { useEffect, useRef } from "react";
import { readTheme } from "@/shared/lib";
import type { WhiteboardScene } from "../model/types";

/**
 * 미리보기 scene 을 Excalidraw exportToSvg 로 그린다. 화면에 보일 때 처음 한 번만 Excalidraw 를 불러온다.
 * 자리는 CSS 가 고정 비율로 먼저 잡으므로 그림이 늦게 와도 카드 크기가 바뀌지 않는다.
 */
export function TemplateThumbnail({
  scene,
}: {
  readonly scene: WhiteboardScene;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box || scene.elements.length === 0) return;
    let cancelled = false;
    const draw = async () => {
      const { exportToSvg, restoreElements } =
        await import("@excalidraw/excalidraw");
      const elements = restoreElements(
        scene.elements as Parameters<typeof restoreElements>[0],
        null,
      ).filter((element) => !element.isDeleted);
      const svg = await exportToSvg({
        elements,
        appState: {
          exportBackground: false,
          exportWithDarkMode: readTheme() === "dark",
        },
        files: null,
        exportPadding: 8,
        skipInliningFonts: true,
      });
      if (cancelled) return;
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("aria-hidden", "true");
      box.replaceChildren(svg);
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      // 미리보기는 꾸밈이다. 못 그려도 이름과 설명으로 고를 수 있다.
      draw().catch(() => undefined);
    });
    observer.observe(box);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [scene]);
  return <div ref={ref} className="whiteboard-template-thumb" />;
}
