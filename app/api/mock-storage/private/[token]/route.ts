/**
 * 文件职责：仅内存阶段使用，接入真实对象存储后整个 mock-storage 目录删除。
 * 模拟私有区媒体签名预览下载接口（GET /api/mock-storage/private/{token}）。
 */

import { notFound } from '@/lib/http/errors';
import { withRoute } from '@/lib/http/route';
import { getMemoryStorage } from '@/lib/storage/client';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/mock-storage/private/{token} 请求。
 * 输入：路径令牌 token。
 * 输出：200 媒体二进制流及对应 Content-Type。
 * 业务规则：仅校验限时下载令牌有效性，令牌无效或过期返回 404。
 */
export const GET = withRoute(async (_req, ctx) => {
  const params = await ctx.params;
  if (typeof params.token !== 'string' || params.token.trim() === '') {
    throw notFound('预览链接无效');
  }

  const storage = getMemoryStorage();
  const file = storage.readWithDownloadToken(params.token);
  return new Response(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'private, no-store',
    },
  });
});
