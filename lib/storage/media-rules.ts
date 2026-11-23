/**
 * 文件职责：集中维护音频、图片、短视频的扩展名/MIME 白名单与大小上限规则（对应技术方案第 5.7 节）。
 */

import { fileTooLarge, fileTypeNotAllowed } from '@/lib/http/errors';

export type MediaCategory = 'audio' | 'image' | 'video';

type MediaRule = {
  extensions: readonly string[];
  mimeTypes: readonly string[];
  maxBytes: number;
  label: string;
};

const MB = 1024 * 1024;

const MEDIA_RULES: Record<MediaCategory, MediaRule> = {
  audio: {
    extensions: ['mp3', 'm4a', 'wav'],
    mimeTypes: [
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/x-m4a',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
    ],
    maxBytes: 30 * MB,
    label: '音频',
  },
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 8 * MB,
    label: '图片',
  },
  video: {
    extensions: ['mp4', 'webm'],
    mimeTypes: ['video/mp4', 'video/webm'],
    maxBytes: 50 * MB,
    label: '视频',
  },
};

/**
 * 从文件名或存储路径中提取小写扩展名。
 * 输入：文件名或路径字符串。
 * 输出：不含点号的小写扩展名；无合法扩展名时返回 null。
 * 业务规则：仅取最后一段路径中最后一个点号之后的部分。
 */
export function extractExtension(fileNameOrPath: string): string | null {
  const slashIndex = fileNameOrPath.lastIndexOf('/');
  const baseName = slashIndex >= 0 ? fileNameOrPath.slice(slashIndex + 1) : fileNameOrPath;
  const dotIndex = baseName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === baseName.length - 1) {
    return null;
  }
  return baseName.slice(dotIndex + 1).toLowerCase();
}

/**
 * 归一化 MIME 类型字符串（去除参数并转小写）。
 * 输入：原始 MIME 类型字符串。
 * 输出：归一化后的主 MIME 类型。
 * 业务规则：用于统一比对浏览器或客户端传入的 Content-Type。
 */
export function normalizeMimeType(mimeType: string): string {
  const semiIndex = mimeType.indexOf(';');
  const mainPart = semiIndex >= 0 ? mimeType.slice(0, semiIndex) : mimeType;
  return mainPart.trim().toLowerCase();
}

/**
 * 按媒体类别校验文件扩展名、MIME 类型和字节大小。
 * 输入：媒体类别 category、文件信息（名称或路径、MIME、大小）、可选错误字段名 fieldName。
 * 输出：校验通过后的 { ext, maxBytes, normalizedMimeType }。
 * 业务规则：
 * 1. 扩展名或 MIME 不在白名单（含 svg/html/未知类型）抛出 400 FILE_TYPE_NOT_ALLOWED。
 * 2. 超过体积上限抛出 413 FILE_TOO_LARGE。
 */
export function assertFileAllowed(
  category: MediaCategory,
  input: {
    fileNameOrPath: string;
    mimeType: string;
    sizeBytes: number;
  },
  fieldName?: string
): {
  ext: string;
  maxBytes: number;
  normalizedMimeType: string;
} {
  const rule = MEDIA_RULES[category];
  const ext = extractExtension(input.fileNameOrPath);
  const fields = fieldName ? { [fieldName]: `${rule.label}格式或大小不符合要求` } : undefined;

  if (!ext || !rule.extensions.includes(ext)) {
    throw fileTypeNotAllowed(
      `不支持的${rule.label}文件扩展名，仅支持 ${rule.extensions.join('、')}`,
      fields
    );
  }

  const normalizedMime = normalizeMimeType(input.mimeType);
  if (!rule.mimeTypes.includes(normalizedMime)) {
    throw fileTypeNotAllowed(`不支持的${rule.label} MIME 类型: ${normalizedMime}`, fields);
  }

  if (input.sizeBytes <= 0) {
    throw fileTypeNotAllowed(`${rule.label}文件不能为空`, fields);
  }

  if (input.sizeBytes > rule.maxBytes) {
    const maxMb = Math.round(rule.maxBytes / MB);
    throw fileTooLarge(`${rule.label}文件不能超过 ${maxMb}MB`, fields);
  }

  return {
    ext,
    maxBytes: rule.maxBytes,
    normalizedMimeType: normalizedMime,
  };
}
