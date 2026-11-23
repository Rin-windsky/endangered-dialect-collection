/**
 * 文件职责：仅内存阶段使用，接入真实对象存储后整个 mock-storage 目录删除。
 * 模拟公开区媒体匿名读取接口（GET /api/mock-storage/public/{...key}）。
 */

import { notFound } from '@/lib/http/errors';
import { withRoute } from '@/lib/http/route';
import { getMemoryStorage } from '@/lib/storage/client';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/mock-storage/public/{...key} 请求。
 * 输入：公开桶对象路径分段数组 key。
 * 输出：200 媒体二进制流及对应 Content-Type。
 * 业务规则：公开区仅包含已发布媒体，撤回后立即返回 404。
 */
export const GET = withRoute(async (_req, ctx) => {
  const params = await ctx.params;
  if (!Array.isArray(params.key) || params.key.length === 0) {
    throw notFound('公开媒体不存在');
  }

  const objectKey = params.key.join('/');
  const storage = getMemoryStorage();
  const file = storage.readPublicObject(objectKey);

  return new Response(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'public, max-age=300',
    },
  });
});
