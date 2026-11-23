/**
 * 文件职责：基于进程内存 Map 实现私有区（private-uploads）与公开区（public-media）隔离存储及签名令牌校验。
 */

import { randomUUID } from 'node:crypto';
import { getConfig } from '@/lib/config';
import { PRIVATE_BUCKET, PUBLIC_BUCKET } from '@/lib/constants';
import {
  fileTooLarge,
  fileTypeNotAllowed,
  notFound,
  statusConflict,
  storageError,
  validationError,
} from '@/lib/http/errors';
import { normalizeMimeType } from './media-rules';
import type {
  BucketName,
  ObjectLocation,
  SignedUploadResult,
  SignedUploadSpec,
  StorageGateway,
  StoredObjectMeta,
} from './types';

type StoredObject = {
  bytes: Uint8Array;
  mimeType: string;
  sizeBytes: number;
};

type UploadTokenEntry = {
  bucket: BucketName;
  key: string;
  mimeType: string;
  maxBytes: number;
  expiresAtMs: number;
  used: boolean;
};

type DownloadTokenEntry = {
  bucket: BucketName;
  key: string;
  expiresAtMs: number;
};

export class MemoryStorage implements StorageGateway {
  private readonly privateBucket = new Map<string, StoredObject>();
  private readonly publicBucket = new Map<string, StoredObject>();
  private readonly uploadTokens = new Map<string, UploadTokenEntry>();
  private readonly downloadTokens = new Map<string, DownloadTokenEntry>();

  private getBucketMap(bucket: BucketName): Map<string, StoredObject> {
    if (bucket === PRIVATE_BUCKET) {
      return this.privateBucket;
    }
    return this.publicBucket;
  }

  /**
   * 签发绑定单次上传令牌的签名上传 URL。
   * 输入：目标桶、对象键、MIME/大小/有效期规格。
   * 输出：{ uploadUrl, token }。
   * 业务规则：令牌记录期望 MIME 与最大字节数，在有效期内仅允许使用一次。
   */
  async createSignedUploadUrl(
    bucket: BucketName,
    key: string,
    spec: SignedUploadSpec
  ): Promise<SignedUploadResult> {
    const token = randomUUID();
    const normalizedMime = normalizeMimeType(spec.mimeType);
    this.uploadTokens.set(token, {
      bucket,
      key,
      mimeType: normalizedMime,
      maxBytes: spec.maxBytes,
      expiresAtMs: Date.now() + spec.expiresInSeconds * 1000,
      used: false,
    });

    const siteUrl = getConfig().siteUrl;
    return {
      uploadUrl: `${siteUrl}/api/mock-storage/upload/${token}`,
      token,
    };
  }

  /**
   * 读取存储对象的元信息（不返回字节内容）。
   * 输入：桶名与对象键。
   * 输出：{ sizeBytes, mimeType } 或 null。
   * 业务规则：用于创建/重提投稿时服务端二次核验文件存在性、类型与大小。
   */
  async headObject(bucket: BucketName, key: string): Promise<StoredObjectMeta | null> {
    const obj = this.getBucketMap(bucket).get(key);
    if (!obj) {
      return null;
    }
    return {
      sizeBytes: obj.sizeBytes,
      mimeType: obj.mimeType,
    };
  }

  /**
   * 为私有区对象签发有时效的下载预览 URL。
   * 输入：桶名、对象键、有效期秒数。
   * 输出：带一次性/限时令牌的私有预览 URL。
   * 业务规则：用于投稿者本人与审核员预览私有区媒体，不向公众开放。
   */
  async createSignedDownloadUrl(
    bucket: BucketName,
    key: string,
    expiresInSeconds: number
  ): Promise<string> {
    const token = randomUUID();
    this.downloadTokens.set(token, {
      bucket,
      key,
      expiresAtMs: Date.now() + expiresInSeconds * 1000,
    });

    const siteUrl = getConfig().siteUrl;
    return `${siteUrl}/api/mock-storage/private/${token}`;
  }

  /**
   * 在存储层内部将对象从源桶复制到目标桶。
   * 输入：源位置 src 与目标位置 dest。
   * 输出：Promise<void>。
   * 业务规则：源文件缺失时抛出 502 STORAGE_ERROR，避免发布半成品。
   */
  async copyObject(src: ObjectLocation, dest: ObjectLocation): Promise<void> {
    const srcObj = this.getBucketMap(src.bucket).get(src.key);
    if (!srcObj) {
      throw storageError(`存储源对象不存在: ${src.bucket}/${src.key}`);
    }

    const copied: StoredObject = {
      bytes: new Uint8Array(srcObj.bytes),
      mimeType: srcObj.mimeType,
      sizeBytes: srcObj.sizeBytes,
    };
    this.getBucketMap(dest.bucket).set(dest.key, copied);
  }

  /**
   * 从指定桶中删除对象。
   * 输入：桶名与对象键。
   * 输出：Promise<void>。
   * 业务规则：用于撤回已发布内容时清理公开媒体或发布失败时的补偿回滚。
   */
  async deleteObject(bucket: BucketName, key: string): Promise<void> {
    this.getBucketMap(bucket).delete(key);
  }

  /**
   * 构造公开区对象的匿名可读 URL。
   * 输入：public-media 桶内的对象键。
   * 输出：公开访问 URL。
   * 业务规则：仅针对公开区对象生成，不带签名参数。
   */
  getPublicUrl(key: string): string {
    const siteUrl = getConfig().siteUrl;
    return `${siteUrl}/api/mock-storage/public/${key}`;
  }

  /**
   * 仅内存模拟路由调用：通过上传令牌写入文件字节。
   * 输入：上传 token、请求头 Content-Type、文件字节。
   * 输出：写入后的对象键与大小。
   * 业务规则：令牌不存在或过期返回 404；重复使用返回 409；Content-Type 不匹配返回 400；超限返回 413。
   */
  putWithUploadToken(
    token: string,
    contentType: string,
    bytes: Uint8Array
  ): { key: string; sizeBytes: number } {
    const entry = this.uploadTokens.get(token);
    if (!entry || Date.now() > entry.expiresAtMs) {
      throw notFound('上传链接不存在或已过期');
    }

    if (entry.used) {
      throw statusConflict('上传链接已被使用，请重新获取上传签名');
    }

    const normalizedContentType = normalizeMimeType(contentType);
    if (normalizedContentType !== entry.mimeType) {
      throw fileTypeNotAllowed(
        `Content-Type 与签名声明不一致，期望 ${entry.mimeType}，实际 ${normalizedContentType}`
      );
    }

    if (bytes.byteLength <= 0) {
      throw validationError(undefined, '上传文件内容不能为空');
    }

    if (bytes.byteLength > entry.maxBytes) {
      throw fileTooLarge('上传文件大小超出限制');
    }

    const stored: StoredObject = {
      bytes: new Uint8Array(bytes),
      mimeType: entry.mimeType,
      sizeBytes: bytes.byteLength,
    };
    this.getBucketMap(entry.bucket).set(entry.key, stored);
    entry.used = true;

    return {
      key: entry.key,
      sizeBytes: stored.sizeBytes,
    };
  }

  /**
   * 仅内存模拟路由调用：通过限时下载令牌读取私有区对象。
   * 输入：下载 token。
   * 输出：字节拷贝与 MIME 类型。
   * 业务规则：令牌无效、过期或对应文件缺失时抛出 404 NOT_FOUND。
   */
  readWithDownloadToken(token: string): { bytes: Uint8Array; mimeType: string } {
    const entry = this.downloadTokens.get(token);
    if (!entry || Date.now() > entry.expiresAtMs) {
      throw notFound('预览链接不存在或已过期');
    }

    const obj = this.getBucketMap(entry.bucket).get(entry.key);
    if (!obj) {
      throw notFound('文件不存在');
    }

    return {
      bytes: new Uint8Array(obj.bytes),
      mimeType: obj.mimeType,
    };
  }

  /**
   * 仅内存模拟路由调用：直接读取公开区（public-media）对象。
   * 输入：公开区对象键 key。
   * 输出：字节拷贝与 MIME 类型。
   * 业务规则：公开区仅存放已发布媒体；撤回或未发布时均返回 404。
   */
  readPublicObject(key: string): { bytes: Uint8Array; mimeType: string } {
    const obj = this.publicBucket.get(key);
    if (!obj) {
      throw notFound('公开媒体不存在');
    }

    return {
      bytes: new Uint8Array(obj.bytes),
      mimeType: obj.mimeType,
    };
  }
}

export { PUBLIC_BUCKET };
