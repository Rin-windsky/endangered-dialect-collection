const blobUrls = new Map<string, string>();

export function registerMockUpload(path: string, file: File): string {
  const url = URL.createObjectURL(file);
  blobUrls.set(path, url);
  return url;
}

export function resolveMedia(path: string | null | undefined, kind: "audio" | "visual"): string | null {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http") || path.startsWith("blob:")) return path;
  const blob = blobUrls.get(path);
  if (blob) return blob;
  return kind === "audio" ? "/mock/audio/ambient-2.wav" : null;
}