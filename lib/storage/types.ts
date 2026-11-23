/**
 * 文件职责：定义对象存储网关抽象接口 StorageGateway 与相关元数据/桶类型（便于后续无缝接入真实云存储）。
 */

export type BucketName = 'private-uploads' | 'public-media';

export type StoredObjectMeta = {
  sizeBytes: number;
  mimeType: string;
};

export type SignedUploadSpec = {
  mimeType: string;
  maxBytes: number;
  expiresInSeconds: number;
};

export type SignedUploadResult = {
  uploadUrl: string;
  token: string;
};

export type ObjectLocation = {
  bucket: BucketName;
  key: string;
};

export interface StorageGateway {
  createSignedUploadUrl(
    bucket: BucketName,
    key: string,
    spec: SignedUploadSpec
  ): Promise<SignedUploadResult>;

  headObject(bucket: BucketName, key: string): Promise<StoredObjectMeta | null>;

  createSignedDownloadUrl(
    bucket: BucketName,
    key: string,
    expiresInSeconds: number
  ): Promise<string>;

  copyObject(src: ObjectLocation, dest: ObjectLocation): Promise<void>;

  deleteObject(bucket: BucketName, key: string): Promise<void>;

  getPublicUrl(key: string): string;
}
