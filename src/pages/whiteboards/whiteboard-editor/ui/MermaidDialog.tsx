"use client";

// 먼저 읽어야 한다: Excalidraw 가 읽히기 전에 글꼴 주소(window.EXCALIDRAW_ASSET_PATH)를 정한다.
import { readTheme } from "@/shared/lib";
import { useEffect, useRef, useState } from "react";
import {
  convertToExcalidrawElements,
  exportToSvg,
} from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Button, Dialog, Textarea } from "@/shared/ui";

const EXAMPLE = `flowchart LR
  A[요청] --> B{로그인했나?}
  B -- 예 --> C[대시보드]
  B -- 아니오 --> D[로그인 화면]`;

const PREVIEW_DELAY = 300;

type Converted =
  | { readonly elements: readonly OrderedExcalidrawElement[] }
  /** detail 은 파서가 준 원문(영어)이다. 한국어 첫 줄 아래 펼쳐 볼 수 있게 둔다. */
  | { readonly error: string; readonly detail?: string };

/**
 * Excalidraw 공식 변환기(@excalidraw/mermaid-to-excalidraw)로 Mermaid 를 도형으로 바꾼다.
 * 변환기는 무거워서 이 대화상자를 처음 열 때 따로 불러온다.
 * 흐름도, 시퀀스, 클래스 다이어그램만 도형이 된다. 다른 종류는 그림(이미지)으로만 나오는데 서버가 이미지를 받지 않는다(D10-6).
 */
async function convert(definition: string): Promise<Converted> {
  try {
    const { parseMermaidToExcalidraw } =
      await import("@excalidraw/mermaid-to-excalidraw");
    const { elements, files } = await parseMermaidToExcalidraw(definition, {
      themeVariables: { fontSize: "16px" },
    });
    if (files && Object.keys(files).length > 0)
      return {
        error:
          "이 종류는 도형으로 바꿀 수 없습니다. flowchart, sequenceDiagram, classDiagram 으로 쓰세요.",
      };
    return {
      elements: convertToExcalidrawElements(
        elements as Parameters<typeof convertToExcalidrawElements>[0],
        { regenerateIds: true },
      ),
    };
  } catch (error) {
    return {
      error: "Mermaid 문법을 확인해 주세요.",
      detail:
        error instanceof Error && error.message ? error.message : undefined,
    };
  }
}

export default function MermaidDialog({
  onClose,
  onInsert,
}: {
  readonly onClose: () => void;
  readonly onInsert: (elements: readonly OrderedExcalidrawElement[]) => void;
}) {
  const [text, setText] = useState(EXAMPLE);
  const [result, setResult] = useState<Converted | null>(null);
  const [converting, setConverting] = useState(true);
  const preview = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!text.trim()) {
        setResult(null);
        setConverting(false);
        preview.current?.replaceChildren();
        return;
      }
      setConverting(true);
      const next = await convert(text);
      if (cancelled) return;
      if ("elements" in next) {
        const svg = await exportToSvg({
          elements: next.elements,
          appState: {
            exportBackground: false,
            exportWithDarkMode: readTheme() === "dark",
          },
          files: null,
          exportPadding: 12,
          skipInliningFonts: true,
        }).catch(() => null);
        if (cancelled) return;
        svg?.removeAttribute("width");
        svg?.removeAttribute("height");
        svg?.setAttribute("aria-hidden", "true");
        preview.current?.replaceChildren(...(svg ? [svg] : []));
      }
      // 오류일 때는 마지막으로 그린 미리보기를 남겨 둔다. 고치는 동안 그림이 깜빡이지 않는다.
      setResult(next);
      setConverting(false);
    }, PREVIEW_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);
  const elements = result && "elements" in result ? result.elements : null;
  const error = result && "error" in result ? result : null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Mermaid로 그리기"
      className="whiteboard-dialog"
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted">
          Mermaid 코드를 붙여 넣으면 고칠 수 있는 도형으로 바꿔 보드 가운데
          넣습니다. 흐름도, 시퀀스, 클래스 다이어그램을 쓸 수 있습니다.
        </p>
        <div className="whiteboard-mermaid">
          <div className="grid content-start gap-1">
            <label htmlFor="whiteboard-mermaid" className="text-sm font-medium">
              Mermaid 코드
            </label>
            <Textarea
              id="whiteboard-mermaid"
              value={text}
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
              aria-describedby="whiteboard-mermaid-error"
            />
          </div>
          <div className="grid content-start gap-1">
            <p className="text-sm font-medium">미리보기</p>
            <div
              ref={preview}
              className="whiteboard-mermaid-preview"
              aria-busy={converting}
              aria-label={
                elements
                  ? `도형 ${elements.length}개 미리보기`
                  : "미리보기 없음"
              }
              role="img"
            />
          </div>
        </div>
        {/* 입력할 때마다 바뀌므로 alert 로 끊지 않고 쉬는 틈에 읽힌다. */}
        <div
          id="whiteboard-mermaid-error"
          aria-live="polite"
          className="whiteboard-mermaid-error"
        >
          {error && (
            <>
              <p className="text-danger">{error.error}</p>
              {error.detail && (
                <details>
                  <summary className="cursor-pointer text-muted">
                    자세히
                  </summary>
                  <pre className="whitespace-pre-wrap text-muted">
                    {error.detail}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setText(EXAMPLE)}>
            예시로 되돌리기
          </Button>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            disabled={!elements || converting || elements.length === 0}
            onClick={() => {
              if (!elements) return;
              onInsert(elements);
              onClose();
            }}
          >
            넣기
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
