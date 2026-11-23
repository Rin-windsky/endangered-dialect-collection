/**
 * 文件职责：获取私有区上传签名地址接口（POST /api/uploads/sign）。
 */

import { requireContributor } from '@/lib/auth/guards';
import { readJson } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { signSubmissionUploads } from '@/lib/services/submission-service';
import { signUploadSchema } from '@/lib/validation/upload';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/uploads/sign 请求。
 * 输入：audio（必填）及可选 visual 的文件元数据。
 * 输出：200 { audio, visual? }。
 * 业务规则：仅投稿者可调用；未传 visual 时响应不返回 visual 键。
 */
export const POST = withRoute(async (req) => {
  const user = await requireContributor(req);
  const body = await readJson(req);
  const input = signUploadSchema.parse(body);
  const signed = await signSubmissionUploads(user, input);
  return jsonOk(signed);
});
