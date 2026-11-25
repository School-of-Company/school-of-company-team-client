/**
 * Excalidraw 가 글꼴을 받을 곳. 비우면 esm.sh 에서 받는다. public/excalidraw/fonts 는
 * scripts/copy-excalidraw-assets.mjs 가 install, dev, build 때 패키지에서 복사한다.
 */
export const EXCALIDRAW_ASSET_PATH = "/excalidraw/";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

/**
 * Excalidraw 는 모듈이 처음 읽힐 때 글꼴 주소를 정한다. 그래서 `import("@excalidraw/excalidraw")`나 그것을 담은
 * 청크를 부르기 직전에 이것을 부른다. 묶음 모듈의 부수효과에 기대지 않는다(번들러가 건너뛸 수 있다).
 */
export function localExcalidrawAssets(): void {
  window.EXCALIDRAW_ASSET_PATH = EXCALIDRAW_ASSET_PATH;
}
