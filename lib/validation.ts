import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label}不能为空` })
    .trim()
    .min(min, `${label}不能为空`)
    .max(max, `${label}不能超过 ${max} 字`);

export const usernameSchema = z
  .string({ error: "请输入用户名" })
  .trim()
  .toLowerCase()
  .regex(/^[a-zA-Z0-9_]{3,20}$/, "用户名为 3–20 位字母、数字或下划线");

export const passwordSchema = z
  .string({ error: "请输入密码" })
  .min(8, "密码至少 8 位")
  .max(72, "密码不能超过 72 位");

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  displayName: z
    .string()
    .trim()
    .max(30, "昵称不能超过 30 字")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const subtitleSegmentSchema = z.object({
  start: z.number({ error: "开始时间格式不正确" }).min(0, "开始时间不能小于 0"),
  end: z.number().positive("结束时间必须大于开始时间").optional(),
  text: z.string().trim().min(1, "字幕原文不能为空").max(300, "单句字幕不能超过 300 字"),
  translation: z.string().max(500).optional(),
});

export const submitterCreditSchema = z.object({
  mode: z.enum(["anonymous", "nickname"]),
  name: z.string().trim().max(30, "公开署名不能超过 30 字").nullable(),
});

export const submissionInputSchema = z
  .object({
    title: trimmed(2, 80, "标题"),
    summary: trimmed(1, 2000, "内容说明"),
    contentType: z.enum(["story", "phrase", "rhyme", "proverb"], { error: "请选择内容类型" }),
    languageId: z.string().nullable().optional(),
    regionId: z.string().min(1, "请选择地区"),
    subtitleSegments: z.array(subtitleSegmentSchema).max(200, "逐句字幕最多 200 条").nullable().optional(),
    translationZh: z.string().trim().max(5000, "释义不能超过 5000 字").nullable().optional(),
    cultureContext: z.string().trim().max(5000, "文化背景不能超过 5000 字").nullable().optional(),
    submitterCredit: submitterCreditSchema.optional(),
    recordingAuthorized: z.literal(true, { error: "请勾选录音授权声明" }),
    audio: z.object({
      path: z.string().min(1, "请上传录音文件"),
      durationSeconds: z.number().min(0).nullable().optional(),
    }),
    visual: z
      .object({
        type: z.enum(["image", "video"]),
        path: z.string().min(1),
      })
      .nullable()
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.submitterCredit?.mode === "nickname") {
      if (!value.submitterCredit.name || value.submitterCredit.name.trim().length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["submitterCredit", "name"],
          message: "选择昵称展示时请填写公开署名",
        });
      }
    }
    if (value.submitterCredit?.mode === "anonymous" && value.submitterCredit.name) {
      ctx.addIssue({
        code: "custom",
        path: ["submitterCredit", "name"],
        message: "匿名展示时不能填写公开署名",
      });
    }
    const segments = value.subtitleSegments;
    if (segments && segments.length > 0) {
      for (let i = 1; i < segments.length; i++) {
        if (segments[i].start <= segments[i - 1].start) {
          ctx.addIssue({
            code: "custom",
            path: ["subtitleSegments", String(i), "start"],
            message: "开始时间需按升序排列",
          });
        }
      }
      segments.forEach((segment, index) => {
        if (segment.end != null && segment.end <= segment.start) {
          ctx.addIssue({
            code: "custom",
            path: ["subtitleSegments", String(index), "end"],
            message: "结束时间必须大于开始时间",
          });
        }
      });
    }
  });

export const returnReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "退回原因至少 5 个字")
    .max(500, "退回原因不能超过 500 个字"),
});

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}