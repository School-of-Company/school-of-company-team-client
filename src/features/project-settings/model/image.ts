export const PROJECT_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const PROJECT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function validateProjectImage(
  file: Pick<File, "type" | "size">,
): string | null {
  if (!PROJECT_IMAGE_TYPES.some((type) => type === file.type))
    return "PNG, JPEG, WebP 이미지를 선택하세요.";
  if (file.size === 0 || file.size > PROJECT_IMAGE_MAX_BYTES)
    return "이미지는 0바이트보다 크고 2MB 이하여야 해요.";
  return null;
}
