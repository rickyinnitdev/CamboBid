export function quotedSearch(value) {
  const text = String(value ?? "")
    .trim()
    .slice(0, 200)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
  return '"%' + text + '%"';
}
export function safeRedirect(value, fallback = "/") {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u001f]/.test(value)
    ? value
    : fallback;
}
