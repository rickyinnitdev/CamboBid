const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};
export function fileExtension(file) {
  const extension = extensions[file.type];
  if (!extension) throw new Error("Unsupported file type");
  return extension;
}
export async function validateFileContent(
  file,
  { document = false, maxBytes = 5 * 1024 * 1024 } = {},
) {
  const allowed = document
    ? ["image/jpeg", "image/png", "application/pdf"]
    : ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type) || file.size < 1 || file.size > maxBytes)
    throw new Error(
      "Use an allowed " +
        (document
          ? "JPG, PNG or PDF document"
          : "JPG, PNG, WebP or GIF image") +
        " within " +
        Math.floor(maxBytes / 1024 / 1024) +
        " MB",
    );
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (prefix) => prefix.every((v, i) => bytes[i] === v);
  const text = new TextDecoder().decode(bytes);
  const valid =
    file.type === "image/jpeg"
      ? starts([255, 216, 255])
      : file.type === "image/png"
        ? starts([137, 80, 78, 71, 13, 10, 26, 10])
        : file.type === "image/gif"
          ? /^GIF8[79]a/.test(text)
          : file.type === "image/webp"
            ? text.startsWith("RIFF") && text.slice(8, 12) === "WEBP"
            : text.startsWith("%PDF-");
  if (!valid) throw new Error("File contents do not match the declared type");
  return fileExtension(file);
}
