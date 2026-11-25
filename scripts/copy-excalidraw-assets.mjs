// Excalidraw 글꼴을 public/excalidraw/fonts 로 복사한다. 편집기는 window.EXCALIDRAW_ASSET_PATH("/excalidraw/")에서
// 글꼴을 받으므로 esm.sh 같은 바깥 주소를 부르지 않는다. 13MB 라 커밋하지 않고 install, dev, build 때 만든다.
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = `${root}node_modules/@excalidraw/excalidraw`;
const source = `${pkg}/dist/prod/fonts`;
const target = `${root}public/excalidraw/fonts`;
const stamp = `${root}public/excalidraw/.version`;

if (!existsSync(source)) {
  console.error(
    `Excalidraw 글꼴이 없습니다: ${source}. pnpm install 을 먼저 하세요.`,
  );
  process.exit(1);
}
const version = JSON.parse(readFileSync(`${pkg}/package.json`, "utf8")).version;
if (existsSync(stamp) && readFileSync(stamp, "utf8") === version)
  process.exit(0);
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
writeFileSync(stamp, version);
console.log(
  `Excalidraw ${version} 글꼴을 public/excalidraw/fonts 에 복사했습니다.`,
);
