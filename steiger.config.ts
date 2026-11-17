import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

export default defineConfig([
  ...fsd.configs.recommended,
  // ponytail: app/providers는 FSD 관례라 허용
  { files: ["./src/app/**"], rules: { "fsd/segments-by-purpose": "off" } },
]);
