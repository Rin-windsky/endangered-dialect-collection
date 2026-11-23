/**
 * 文件职责：仅内存阶段使用，接入真实对象存储后整个 mock-storage 目录删除。
 * 模拟签名直传接口（PUT /api/mock-storage/upload/{token}）。
 */

import { notFound } from '@/lib/http/errors';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { getMemoryStorage } from '@/lib/storage/client';

export const dynamic = 'force-dynamic';

/**
 * 处理 PUT /api/mock-storage/upload/{token} 请求。
 * 输入：路径令牌 token、Content-Type 请求头及二进制文件体。
 * 输出：200 { ok: true, key, sizeBytes }。
 * 业务规则：仅内存阶段模拟直传目标，校验单次令牌、MIME 一致性与大小上限。
 */
export const PUT = withRoute(async (req, ctx) => {
  const params = await ctx.params;
  if (typeof params.token !== 'string' || params.token.trim() === '') {
    throw notFound('上传链接无效');
  }

  const contentType = req.headers.get('content-type') ?? '';
  const buffer = await req.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const storage = getMemoryStorage();
  const stored = storage.putWithUploadToken(params.token, contentType, bytes);
  return jsonOk({
    ok: true,
    key: stored.key,
    sizeBytes: stored.sizeBytes,
  });
});
