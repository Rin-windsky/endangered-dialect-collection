/**
 * 文件职责：创建并提交投稿接口（POST /api/submissions）。
 */

import { requireContributor } from '@/lib/auth/guards';
import { readJson } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { createSubmission } from '@/lib/services/submission-service';
import { createSubmissionSchema } from '@/lib/validation/submission';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/submissions 请求。
 * 输入：投稿表单及已上传私有媒体路径。
 * 输出：201 { id, status: 'pending' }。
 * 业务规则：仅投稿者可调用，创建即提交审核，录音授权声明必须为 true。
 */
export const POST = withRoute(async (req) => {
  const user = await requireContributor(req);
  const body = await readJson(req);
  const input = createSubmissionSchema.parse(body);
  const created = await createSubmission(user, input);
  return jsonOk(created, 201);
});
