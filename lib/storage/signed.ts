/**
 * 文件职责：封装私有区上传签名签发、提交时文件二次核验及 10 分钟私有预览 URL 签发（对应技术方案第 5.3、5.6 节）。
 */

import { randomUUID } from 'node:crypto';
import {
  DOWNLOAD_SIGN_EXPIRES_SECONDS,
  PRIVATE_BUCKET,
  UPLOAD_SIGN_EXPIRES_SECONDS,
} from '@/lib/constants';
import { validationError } from '@/lib/http/errors';
import type { VisualType } from '@/lib/types';
import { getStorage } from './client';
import { assertFileAllowed, type MediaCategory } from './media-rules';

export type SignUploadFileInput = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type SignUploadsInput = {
  audio: SignUploadFileInput;
  visual?: SignUploadFileInput & { type: VisualType };
};

export type SignedFileDescriptor = {
  path: string;
  uploadUrl: string;
  token: string;
};

export type SignUploadsOutput = {
  audio: SignedFileDescriptor;
  visual?: SignedFileDescriptor;
};

/**
 * 为投稿者签发私有区音频及可选主视觉素材的上传地址。
 * 输入：当前投稿者 userId 与上传文件元数据 input。
 * 输出：音频上传描述；若传入 visual 则同时包含 visual 上传描述，未传时不返回 visual 键。
 * 业务规则：
 * 1. path 强制以 `{userId}/audio/` 或 `{userId}/visual/` 开头，文件名使用随机 UUID。
 * 2. 上传前先校验扩展名、MIME 与字节上限。
 */
export async function signUploads(
  userId: string,
  input: SignUploadsInput
): Promise<SignUploadsOutput> {
  const storage = getStorage();

  const audioCheck = assertFileAllowed(
    'audio',
    {
      fileNameOrPath: input.audio.fileName,
      mimeType: input.audio.mimeType,
      sizeBytes: input.audio.sizeBytes,
    },
    'audio'
  );

  const audioPath = `${userId}/audio/${randomUUID()}.${audioCheck.ext}`;
  const audioSigned = await storage.createSignedUploadUrl(PRIVATE_BUCKET, audioPath, {
    mimeType: audioCheck.normalizedMimeType,
    maxBytes: audioCheck.maxBytes,
    expiresInSeconds: UPLOAD_SIGN_EXPIRES_SECONDS,
  });

  const result: SignUploadsOutput = {
    audio: {
      path: audioPath,
      uploadUrl: audioSigned.uploadUrl,
      token: audioSigned.token,
    },
  };

  if (input.visual) {
    const visualCheck = assertFileAllowed(
      input.visual.type,
      {
        fileNameOrPath: input.visual.fileName,
        mimeType: input.visual.mimeType,
        sizeBytes: input.visual.sizeBytes,
      },
      'visual'
    );

    const visualPath = `${userId}/visual/${randomUUID()}.${visualCheck.ext}`;
    const visualSigned = await storage.createSignedUploadUrl(PRIVATE_BUCKET, visualPath, {
      mimeType: visualCheck.normalizedMimeType,
      maxBytes: visualCheck.maxBytes,
      expiresInSeconds: UPLOAD_SIGN_EXPIRES_SECONDS,
    });

    result.visual = {
      path: visualPath,
      uploadUrl: visualSigned.uploadUrl,
      token: visualSigned.token,
    };
  }

  return result;
}

/**
 * 在创建或重提投稿时，服务端二次核验私有桶中的对象归属、存在性、格式和大小。
 * 输入：当前用户 userId、媒体类别 category、目录分类 kind（audio/visual）、存储路径 path、报错字段名 fieldName。
 * 输出：Promise<void>。
 * 业务规则：不信任前端声明；path 必须归属当前用户目录，对象必须真实存在且符合白名单与大小限制。
 */
export async function verifyUploadedObject(
  userId: string,
  category: MediaCategory,
  kind: 'audio' | 'visual',
  path: string,
  fieldName: string
): Promise<void> {
  const expectedPrefix = `${userId}/${kind}/`;
  // 归属校验：禁止引用他人目录下的私有文件
  if (!path.startsWith(expectedPrefix) || path.includes('..')) {
    throw validationError({ [fieldName]: '文件路径无效或无权引用该文件' });
  }

  const storage = getStorage();
  const meta = await storage.headObject(PRIVATE_BUCKET, path);
  if (!meta) {
    throw validationError({ [fieldName]: '文件尚未上传或已失效，请重新上传' });
  }

  assertFileAllowed(
    category,
    {
      fileNameOrPath: path,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
    },
    fieldName
  );
}

/**
 * 为私有区媒体文件签发 10 分钟有效的临时预览 URL。
 * 输入：私有桶对象键 key。
 * 输出：签名下载 URL 字符串。
 * 业务规则：仅用于本人查看或审核员审核时预览，不落库、不对外公开。
 */
export async function signPrivatePreview(key: string): Promise<string> {
  const storage = getStorage();
  return storage.createSignedDownloadUrl(PRIVATE_BUCKET, key, DOWNLOAD_SIGN_EXPIRES_SECONDS);
}
