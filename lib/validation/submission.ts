/**
 * 文件职责：定义创建投稿与退回后修改重提接口的 Zod 校验 Schema（对应技术方案第 6.4.2、6.4.5 节）。
 */

import { z } from 'zod';
import { CONTENT_TYPES, SUBMITTER_CREDIT_MODES, VISUAL_TYPES } from '@/lib/constants';

function emptyStringToNull(val: unknown): unknown {
  if (typeof val === 'string' && val.trim() === '') {
    return null;
  }
  return val;
}

const titleSchema = z
  .string({ error: '标题不能为空' })
  .trim()
  .min(2, '标题至少 2 个字')
  .max(80, '标题最多 80 个字');

const summarySchema = z
  .string({ error: '内容说明不能为空' })
  .trim()
  .min(1, '内容说明不能为空')
  .max(2000, '内容说明最多 2000 字');

const contentTypeSchema = z.enum(CONTENT_TYPES, { error: '不支持的内容类型' });
const languageIdSchema = z.uuid('方言 ID 格式无效').nullable();
const regionIdSchema = z.uuid('地区 ID 格式无效');

const optionalNullableTextSchema = (maxLen: number, label: string) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().max(maxLen, `${label}最多 ${maxLen} 字`).nullable().optional()
  );

const subtitleItemSchema = z.object({
  start: z.number({ error: '字幕开始时间必须是数字' }).min(0, '字幕开始时间不能小于 0'),
  end: z.number({ error: '字幕结束时间必须是数字' }).min(0, '字幕结束时间不能小于 0').optional(),
  text: z
    .string({ error: '字幕原文不能为空' })
    .trim()
    .min(1, '字幕原文不能为空')
    .max(500, '单句字幕最多 500 字'),
  translation: z.string().trim().max(500, '单句字幕译文最多 500 字').optional(),
});

const subtitleSegmentsSchema = z
  .array(subtitleItemSchema)
  .max(200, '字幕最多 200 条')
  .superRefine((segments, ctx) => {
    for (let i = 0; i < segments.length; i++) {
      const current = segments[i];
      if (current.end !== undefined && current.end <= current.start) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'end'],
          message: '字幕结束时间必须大于开始时间',
        });
      }
      if (i > 0) {
        const previous = segments[i - 1];
        if (current.start <= previous.start) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'start'],
            message: '字幕开始时间必须严格递增',
          });
        }
      }
    }
  });

const submitterCreditSchema = z
  .object({
    mode: z.enum(SUBMITTER_CREDIT_MODES, { error: '署名方式无效' }),
    name: z.string().trim().max(30, '公开署名最多 30 个字').nullable().optional(),
  })
  .superRefine((credit, ctx) => {
    if (credit.mode === 'nickname') {
      if (!credit.name || credit.name.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: '昵称署名模式下必须填写公开名称',
        });
      }
      return;
    }

    if (credit.name !== undefined && credit.name !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['name'],
        message: '匿名模式下不能填写公开名称',
      });
    }
  });

const audioInputSchema = z.object({
  path: z.string({ error: '音频路径不能为空' }).trim().min(1, '音频路径不能为空'),
  durationSeconds: z
    .number({ error: '音频时长必须是数字' })
    .int('音频时长必须是整数')
    .positive('音频时长必须大于 0')
    .nullable()
    .optional(),
});

const visualInputSchema = z.object({
  type: z.enum(VISUAL_TYPES, { error: '主视觉类型必须是 image 或 video' }),
  path: z.string({ error: '主视觉路径不能为空' }).trim().min(1, '主视觉路径不能为空'),
});

const recordingAuthorizedSchema = z.literal(true, {
  error: '请勾选录音授权声明',
});

export const createSubmissionSchema = z.object({
  title: titleSchema,
  summary: summarySchema,
  contentType: contentTypeSchema,
  languageId: languageIdSchema.optional(),
  regionId: regionIdSchema,
  translationZh: optionalNullableTextSchema(5000, '普通话释义'),
  cultureContext: optionalNullableTextSchema(5000, '文化背景'),
  subtitleSegments: subtitleSegmentsSchema.nullable().optional(),
  submitterCredit: submitterCreditSchema.optional(),
  recordingAuthorized: recordingAuthorizedSchema,
  audio: audioInputSchema,
  visual: visualInputSchema.nullable().optional(),
});

export const patchSubmissionSchema = z.object({
  title: titleSchema.optional(),
  summary: summarySchema.optional(),
  contentType: contentTypeSchema.optional(),
  languageId: languageIdSchema.optional(),
  regionId: regionIdSchema.optional(),
  translationZh: optionalNullableTextSchema(5000, '普通话释义'),
  cultureContext: optionalNullableTextSchema(5000, '文化背景'),
  subtitleSegments: subtitleSegmentsSchema.nullable().optional(),
  submitterCredit: submitterCreditSchema.nullable().optional(),
  recordingAuthorized: recordingAuthorizedSchema.optional(),
  audio: audioInputSchema.optional(),
  visual: visualInputSchema.nullable().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type PatchSubmissionInput = z.infer<typeof patchSubmissionSchema>;
