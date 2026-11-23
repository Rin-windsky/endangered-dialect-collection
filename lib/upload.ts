import { API_MODE } from "./api/client";
import { registerMockUpload } from "./mock/media";

export async function uploadToSignedUrl(
  uploadUrl: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (API_MODE === "mock" || uploadUrl.startsWith("mock://")) {
    registerMockUpload(path, file);
    await new Promise<void>((resolve) => {
      let progress = 0;
      const timer = window.setInterval(() => {
        progress = Math.min(100, progress + 12 + Math.random() * 18);
        onProgress?.(Math.round(progress));
        if (progress >= 100) {
          window.clearInterval(timer);
          resolve();
        }
      }, 90);
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error("文件上传失败，请重试"));
      }
    };
    xhr.onerror = () => reject(new Error("网络中断，文件上传失败"));
    xhr.send(file);
  });
}

export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
    };
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : null;
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = url;
  });
}

export function fileExtension(name: string): string {
  return name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";
}

export function validateFile(
  file: File,
  rules: { extensions: readonly string[]; mimeTypes: readonly string[]; maxBytes: number; hint: string },
): string | null {
  const ext = fileExtension(file.name);
  if (!rules.extensions.includes(ext)) {
    return `文件格式不支持，请上传 ${rules.hint}`;
  }
  if (file.type && !rules.mimeTypes.includes(file.type)) {
    return `文件格式不支持，请上传 ${rules.hint}`;
  }
  if (file.size > rules.maxBytes) {
    return `文件超过大小限制，${rules.hint}`;
  }
  if (file.size <= 0) return "文件内容为空";
  return null;
}