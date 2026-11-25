/**
 * Excalidraw 가 글꼴을 받을 곳. 비우면 esm.sh 에서 받는다. public/excalidraw/fonts 는
 * scripts/copy-excalidraw-assets.mjs 가 install, dev, build 때 패키지에서 복사한다.
 * Excalidraw 모듈이 처음 읽힐 때 주소를 정하므로 그보다 먼저 이 모듈이 실행돼야 한다(shared/lib 를 먼저 import).
 */
export const EXCALIDRAW_ASSET_PATH = "/excalidraw/";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

if (typeof window !== "undefined")
  window.EXCALIDRAW_ASSET_PATH = EXCALIDRAW_ASSET_PATH;
