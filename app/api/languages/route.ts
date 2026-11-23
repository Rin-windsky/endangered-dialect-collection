/**
 * 文件职责：方言/语言选项接口（GET /api/languages）。
 */

import { searchParamsToObject } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { listLanguages } from '@/lib/services/public-service';
import { scopeQuerySchema } from '@/lib/validation/public';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/languages 请求。
 * 输入：查询参数 scope=public|all（默认 public）。
 * 输出：200 LanguageOption[]。
 * 业务规则：public 仅返回有公开内容的语言并附带 count；all 返回全部预置语言。
 */
export const GET = withRoute(async (req) => {
  const rawQuery = searchParamsToObject(req);
  const { scope } = scopeQuerySchema.parse(rawQuery);
  const options = await listLanguages(scope);
  return jsonOk(options);
});
