/**
 * 文件职责：定义账号注册与登录接口的 Zod 请求校验 Schema（对应技术方案第 3.1、6.2 节）。
 */

import { z } from 'zod';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function normalizeOptionalDisplayName(val: unknown): unknown {
  if (val === null || val === undefined) {
    return undefined;
  }
  if (typeof val === 'string' && val.trim() === '') {
    return undefined;
  }
  return val;
}

export const registerSchema = z.object({
  username: z
    .string({ error: '用户名不能为空' })
    .trim()
    .min(3, '用户名至少 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(USERNAME_REGEX, '用户名只能包含字母、数字和下划线')
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ error: '密码不能为空' })
    .min(8, '密码至少 8 位')
    .max(72, '密码最多 72 位'),
  displayName: z.preprocess(
    normalizeOptionalDisplayName,
    z.string().trim().min(1, '昵称不能为空').max(30, '昵称最多 30 个字').optional()
  ),
});

export const loginSchema = z.object({
  username: z
    .string({ error: '用户名不能为空' })
    .trim()
    .min(1, '用户名不能为空')
    .max(20, '用户名格式不正确')
    .transform((value) => value.toLowerCase()),
  password: z.string({ error: '密码不能为空' }).min(1, '密码不能为空').max(72, '密码过长'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
