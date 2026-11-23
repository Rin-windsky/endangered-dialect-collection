/**
 * 文件职责：定义获取私有区上传签名接口的 Zod 校验 Schema（对应技术方案第 6.4.1 节）。
 */

import { z } from 'zod';
import { VISUAL_TYPES } from '@/lib/constants';

const uploadFileMetaSchema = z.object({
  fileName: z.string({ error: '文件名不能为空' }).trim().min(1, '文件名不能为空').max(255, '文件名过长'),
  mimeType: z.string({ error: 'MIME 类型不能为空' }).trim().min(1, 'MIME 类型不能为空').max(128, 'MIME 类型过长'),
  sizeBytes: z
    .number({ error: '文件大小必须是数字' })
    .int('文件大小必须是整数')
    .positive('文件大小必须大于 0'),
});

export const signUploadSchema = z.object({
  audio: uploadFileMetaSchema,
  visual: uploadFileMetaSchema
    .extend({
      type: z.enum(VISUAL_TYPES, { error: '主视觉类型必须是 image 或 video' }),
    })
    .optional(),
});

export type SignUploadRequestInput = z.infer<typeof signUploadSchema>;
