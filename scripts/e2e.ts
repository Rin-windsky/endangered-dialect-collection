/**
 * 文件职责：端到端（E2E）黑盒 HTTP 验证脚本，覆盖认证、守卫、上传、投稿、退回、重提、发布、公开浏览、撤回与登录限流全链路。
 */

import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

class CookieJar {
  private sessionCookie: string | null = null;

  updateFromResponse(res: Response): void {
    const setCookies = res.headers.getSetCookie();
    for (const header of setCookies) {
      const firstSegment = header.split(';')[0];
      const eqIdx = firstSegment.indexOf('=');
      if (eqIdx <= 0) {
        continue;
      }
      const name = firstSegment.slice(0, eqIdx).trim();
      const value = firstSegment.slice(eqIdx + 1).trim();
      if (name !== 'xy_session') {
        continue;
      }
      if (header.includes('Max-Age=0') || value === '') {
        this.sessionCookie = null;
      } else {
        this.sessionCookie = `${name}=${value}`;
      }
    }
  }

  hasSession(): boolean {
    return this.sessionCookie !== null;
  }

  getHeader(): string | null {
    return this.sessionCookie;
  }
}

type HttpResult = {
  status: number;
  json: unknown;
  text: string;
  headers: Headers;
};

async function requestJson(
  method: string,
  urlPath: string,
  options?: {
    jar?: CookieJar;
    body?: unknown;
    origin?: string | null;
  }
): Promise<HttpResult> {
  const headers: Record<string, string> = {};
  if (options?.jar) {
    const cookieHeader = options.jar.getHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
  }

  const isWriteMethod =
    method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE';
  if (isWriteMethod) {
    if (options?.origin === undefined) {
      headers.Origin = BASE_URL;
    } else if (options.origin !== null) {
      headers.Origin = options.origin;
    }
  }

  let bodyText: string | undefined;
  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyText = JSON.stringify(options.body);
  }

  const fullUrl = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: bodyText,
  });

  if (options?.jar) {
    options.jar.updateFromResponse(res);
  }

  const text = await res.text();
  let parsedJson: unknown = null;
  if (text.trim() !== '') {
    try {
      parsedJson = JSON.parse(text);
    } catch {
      parsedJson = null;
    }
  }

  return {
    status: res.status,
    json: parsedJson,
    text,
    headers: res.headers,
  };
}

async function putBinary(
  uploadUrl: string,
  mimeType: string,
  bytes: Uint8Array
): Promise<HttpResult> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      Origin: BASE_URL,
    },
    body: Buffer.from(bytes),
  });

  const text = await res.text();
  let parsedJson: unknown = null;
  if (text.trim() !== '') {
    try {
      parsedJson = JSON.parse(text);
    } catch {
      parsedJson = null;
    }
  }

  return {
    status: res.status,
    json: parsedJson,
    text,
    headers: res.headers,
  };
}

async function getBinary(url: string): Promise<{ status: number; bytes: Uint8Array }> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  return {
    status: res.status,
    bytes: new Uint8Array(buffer),
  };
}

function makePatternBytes(size: number, seedByte: number): Uint8Array {
  const arr = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = (seedByte + i) % 251;
  }
  return arr;
}

function assertNoForbiddenDataInPublicJson(
  payload: unknown,
  forbiddenKeys: Set<string>,
  forbiddenUsername: string
): void {
  const serialized = JSON.stringify(payload);
  assert.equal(
    serialized.includes(forbiddenUsername),
    false,
    `公开响应中不得包含投稿者用户名 ${forbiddenUsername}`
  );

  function walk(node: unknown, currentPath: string): void {
    if (node === null || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        walk(node[i], `${currentPath}[${i}]`);
      }
      return;
    }

    const record = node as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      assert.equal(
        forbiddenKeys.has(key),
        false,
        `公开响应中出现禁止字段 ${currentPath}.${key}`
      );
      walk(record[key], `${currentPath}.${key}`);
    }
  }

  walk(payload, '$');
}

async function waitForServerReady(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/regions?scope=all`);
      if (res.status === 200) {
        return;
      }
    } catch {
      // 服务尚未就绪时继续等待重试
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`等待 Next.js 服务启动超时（${timeoutMs}ms）`);
}

async function main(): Promise<void> {
  const startAt = Date.now();
  const jwtSecret = randomBytes(48).toString('hex');
  const reviewerUsername = 'e2e_reviewer';
  const reviewerPassword = `Rev_${randomBytes(12).toString('hex')}`;

  const nextBin = path.join(process.cwd(), 'node_modules', '.bin', 'next');
  const serverProcess: ChildProcess = spawn(nextBin, ['start', '-p', String(PORT)], {
    env: {
      ...process.env,
      JWT_SECRET: jwtSecret,
      SITE_URL: BASE_URL,
      SEED_REVIEWER_USERNAME: reviewerUsername,
      SEED_REVIEWER_PASSWORD: reviewerPassword,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const serverLogs: string[] = [];
  serverProcess.stdout?.on('data', (chunk: Buffer) => {
    serverLogs.push(chunk.toString('utf8'));
  });
  serverProcess.stderr?.on('data', (chunk: Buffer) => {
    serverLogs.push(chunk.toString('utf8'));
  });

  let passedCount = 0;

  async function step(stage: string, description: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      passedCount += 1;
      console.log(`✓ [${stage}] ${description}`);
    } catch (err) {
      console.error(`✗ [${stage}] ${description}`);
      console.error(err);
      if (serverLogs.length > 0) {
        console.error('--- 服务端最近日志 ---');
        console.error(serverLogs.slice(-20).join(''));
      }
      throw err;
    }
  }

  try {
    await waitForServerReady(30000);

    const jarA = new CookieJar();
    const jarB = new CookieJar();
    const jarReviewer = new CookieJar();

    const suffix = Date.now();
    const usernameA = `e2e_a_${suffix}`;
    const usernameB = `e2e_b_${suffix}`;
    const passwordA = 'PassWord_A_123';
    const passwordB = 'PassWord_B_123';

    let fujianRegionId = '';
    let firstLanguageId = '';
    let userAId = '';
    let userBId = '';

    await step('前置', '读取福建省 regionId 与首个预置语言 languageId', async () => {
      const regRes = await requestJson('GET', '/api/regions?scope=all');
      assert.equal(regRes.status, 200);
      const regions = regRes.json as Array<{ id: string; name: string; mapKey: string }>;
      assert.equal(regions.length, 34);
      const fujian = regions.find((r) => r.name === '福建省');
      assert.ok(fujian, '未找到福建省');
      fujianRegionId = fujian.id;

      const langRes = await requestJson('GET', '/api/languages?scope=all');
      assert.equal(langRes.status, 200);
      const languages = langRes.json as Array<{ id: string; name: string }>;
      assert.ok(languages.length >= 1, '语言列表不能为空');
      firstLanguageId = languages[0].id;
    });

    await step('阶段1', '注册 A（201 + Cookie）、重复用户名 409、B 传 role=reviewer 仍为 contributor', async () => {
      const resA = await requestJson('POST', '/api/auth/register', {
        jar: jarA,
        body: {
          username: usernameA,
          password: passwordA,
          displayName: '阿禾',
        },
      });
      assert.equal(resA.status, 201);
      assert.equal(jarA.hasSession(), true);
      const bodyA = resA.json as { user: { id: string; username: string; role: string } };
      assert.equal(bodyA.user.role, 'contributor');
      assert.equal(bodyA.user.username, usernameA);
      userAId = bodyA.user.id;

      const dupRes = await requestJson('POST', '/api/auth/register', {
        body: {
          username: usernameA.toUpperCase(),
          password: passwordA,
        },
      });
      assert.equal(dupRes.status, 409);
      const dupBody = dupRes.json as { error: { code: string } };
      assert.equal(dupBody.error.code, 'USERNAME_TAKEN');

      const resB = await requestJson('POST', '/api/auth/register', {
        jar: jarB,
        body: {
          username: usernameB,
          password: passwordB,
          role: 'reviewer',
        },
      });
      assert.equal(resB.status, 201);
      const bodyB = resB.json as { user: { id: string; role: string } };
      assert.equal(bodyB.user.role, 'contributor');
      userBId = bodyB.user.id;
    });

    await step('阶段1', '验证 /api/me、退出登录、错密码 401、正确登录与审核员登录', async () => {
      const me1 = await requestJson('GET', '/api/me', { jar: jarA });
      assert.equal(me1.status, 200);
      assert.equal((me1.json as { id: string }).id, userAId);

      const logoutRes = await requestJson('POST', '/api/auth/logout', { jar: jarA });
      assert.equal(logoutRes.status, 204);
      assert.equal(jarA.hasSession(), false);

      const meAfterLogout = await requestJson('GET', '/api/me', { jar: jarA });
      assert.equal(meAfterLogout.status, 401);
      assert.equal((meAfterLogout.json as { error: { code: string } }).error.code, 'AUTH_REQUIRED');

      const badLogin = await requestJson('POST', '/api/auth/login', {
        body: { username: usernameA, password: 'WrongPassword!' },
      });
      assert.equal(badLogin.status, 401);
      assert.equal((badLogin.json as { error: { code: string } }).error.code, 'INVALID_CREDENTIALS');

      const goodLogin = await requestJson('POST', '/api/auth/login', {
        jar: jarA,
        body: { username: usernameA, password: passwordA },
      });
      assert.equal(goodLogin.status, 200);
      assert.equal(jarA.hasSession(), true);

      const revLogin = await requestJson('POST', '/api/auth/login', {
        jar: jarReviewer,
        body: { username: reviewerUsername, password: reviewerPassword },
      });
      assert.equal(revLogin.status, 200);
      assert.equal((revLogin.json as { user: { role: string } }).user.role, 'reviewer');
    });

    await step('阶段1', '角色守卫与跨站 Origin 守卫校验（401 / 403）', async () => {
      const aToReview = await requestJson('GET', '/api/review/submissions', { jar: jarA });
      assert.equal(aToReview.status, 403);
      assert.equal((aToReview.json as { error: { code: string } }).error.code, 'FORBIDDEN');

      const revToSign = await requestJson('POST', '/api/uploads/sign', {
        jar: jarReviewer,
        body: {
          audio: { fileName: 'a.mp3', mimeType: 'audio/mpeg', sizeBytes: 1024 },
        },
      });
      assert.equal(revToSign.status, 403);
      assert.equal((revToSign.json as { error: { code: string } }).error.code, 'FORBIDDEN');

      const anonSubmit = await requestJson('POST', '/api/submissions', { body: {} });
      assert.equal(anonSubmit.status, 401);
      assert.equal((anonSubmit.json as { error: { code: string } }).error.code, 'AUTH_REQUIRED');

      const badOrigin = await requestJson('POST', '/api/uploads/sign', {
        jar: jarA,
        origin: 'http://evil.example',
        body: {
          audio: { fileName: 'a.mp3', mimeType: 'audio/mpeg', sizeBytes: 1024 },
        },
      });
      assert.equal(badOrigin.status, 403);
      assert.equal((badOrigin.json as { error: { code: string } }).error.code, 'FORBIDDEN');
    });

    const audioBytesV1 = makePatternBytes(2048, 17);
    let audioPath1 = '';
    let uploadUrl1 = '';

    await step('阶段2', '上传签名校验（仅音频无 visual 键、拒绝 SVG 400、超 30MB 413）及单次 PUT 上传', async () => {
      const signRes = await requestJson('POST', '/api/uploads/sign', {
        jar: jarA,
        body: {
          audio: { fileName: 'story.m4a', mimeType: 'audio/mp4', sizeBytes: audioBytesV1.byteLength },
        },
      });
      assert.equal(signRes.status, 200);
      const signBody = signRes.json as Record<string, unknown>;
      assert.equal('visual' in signBody, false, '未传 visual 时不应返回 visual 键');
      const audioDesc = signBody.audio as { path: string; uploadUrl: string };
      assert.equal(audioDesc.path.startsWith(`${userAId}/audio/`), true);
      audioPath1 = audioDesc.path;
      uploadUrl1 = audioDesc.uploadUrl;

      const svgRes = await requestJson('POST', '/api/uploads/sign', {
        jar: jarA,
        body: {
          audio: { fileName: 'story.m4a', mimeType: 'audio/mp4', sizeBytes: 1024 },
          visual: { type: 'image', fileName: 'bad.svg', mimeType: 'image/svg+xml', sizeBytes: 1024 },
        },
      });
      assert.equal(svgRes.status, 400);
      assert.equal((svgRes.json as { error: { code: string } }).error.code, 'FILE_TYPE_NOT_ALLOWED');

      const hugeRes = await requestJson('POST', '/api/uploads/sign', {
        jar: jarA,
        body: {
          audio: { fileName: 'huge.mp3', mimeType: 'audio/mpeg', sizeBytes: 31 * 1024 * 1024 },
        },
      });
      assert.equal(hugeRes.status, 413);
      assert.equal((hugeRes.json as { error: { code: string } }).error.code, 'FILE_TOO_LARGE');

      const put1 = await putBinary(uploadUrl1, 'audio/mp4', audioBytesV1);
      assert.equal(put1.status, 200);

      const putReplay = await putBinary(uploadUrl1, 'audio/mp4', audioBytesV1);
      assert.equal(putReplay.status, 409);
      assert.equal((putReplay.json as { error: { code: string } }).error.code, 'STATUS_CONFLICT');
    });

    let item1Id = '';
    let item2Id = '';

    await step('阶段2', '创建投稿校验（未勾选授权 400、引用他人 path 400、核心字段提交成功 201）', async () => {
      const noAuthRes = await requestJson('POST', '/api/submissions', {
        jar: jarA,
        body: {
          title: '阿婆讲端午',
          summary: '一段端午口述记忆',
          contentType: 'story',
          languageId: firstLanguageId,
          regionId: fujianRegionId,
          recordingAuthorized: false,
          audio: { path: audioPath1, durationSeconds: 30 },
        },
      });
      assert.equal(noAuthRes.status, 400);
      const noAuthBody = noAuthRes.json as { error: { fields?: Record<string, string> } };
      assert.ok(noAuthBody.error.fields?.recordingAuthorized, '应返回 recordingAuthorized 字段错误');

      const foreignPathRes = await requestJson('POST', '/api/submissions', {
        jar: jarA,
        body: {
          title: '阿婆讲端午',
          summary: '一段端午口述记忆',
          contentType: 'story',
          languageId: firstLanguageId,
          regionId: fujianRegionId,
          recordingAuthorized: true,
          audio: { path: `${userBId}/audio/${randomUUID()}.m4a`, durationSeconds: 30 },
        },
      });
      assert.equal(foreignPathRes.status, 400);

      const create1 = await requestJson('POST', '/api/submissions', {
        jar: jarA,
        body: {
          title: '阿婆讲端午',
          summary: '一段关于端午节包粽子的口述记忆',
          contentType: 'story',
          languageId: firstLanguageId,
          regionId: fujianRegionId,
          recordingAuthorized: true,
          audio: { path: audioPath1, durationSeconds: 30 },
        },
      });
      assert.equal(create1.status, 201);
      const body1 = create1.json as { id: string; status: string };
      assert.equal(body1.status, 'pending');
      item1Id = body1.id;

      // 再创建第二条 pending 投稿，后续用于验证 pending 状态直接撤回
      const sign2 = await requestJson('POST', '/api/uploads/sign', {
        jar: jarA,
        body: {
          audio: { fileName: 'proverb.wav', mimeType: 'audio/wav', sizeBytes: 1024 },
        },
      });
      assert.equal(sign2.status, 200);
      const audio2 = (sign2.json as { audio: { path: string; uploadUrl: string } }).audio;
      const put2 = await putBinary(audio2.uploadUrl, 'audio/wav', makePatternBytes(1024, 33));
      assert.equal(put2.status, 200);

      const create2 = await requestJson('POST', '/api/submissions', {
        jar: jarA,
        body: {
          title: '待撤回俗语测试',
          summary: '用于验证 pending 状态下撤回的测试条目',
          contentType: 'proverb',
          languageId: null,
          regionId: fujianRegionId,
          recordingAuthorized: true,
          audio: { path: audio2.path },
        },
      });
      assert.equal(create2.status, 201);
      item2Id = (create2.json as { id: string }).id;
    });

    await step('阶段2', '我的投稿列表/详情、私有预览字节核验、非本人 404 及公开详情 404', async () => {
      const listRes = await requestJson('GET', '/api/my-submissions', { jar: jarA });
      assert.equal(listRes.status, 200);
      const listBody = listRes.json as {
        items: Array<{ id: string; status: string; lastReview: unknown }>;
      };
      const found = listBody.items.find((it) => it.id === item1Id);
      assert.ok(found, '我的投稿列表中应包含新建条目');
      assert.equal(found.status, 'pending');
      assert.equal(found.lastReview, null);

      const detailRes = await requestJson('GET', `/api/submissions/${item1Id}`, { jar: jarA });
      assert.equal(detailRes.status, 200);
      const detail = detailRes.json as {
        recordingAuthorized: boolean;
        subtitleSegments: unknown[];
        visual: unknown;
        audio: { url: string };
      };
      assert.equal(detail.recordingAuthorized, true);
      assert.equal(detail.subtitleSegments.length, 0);
      assert.equal(detail.visual, null);

      const privateAudio = await getBinary(detail.audio.url);
      assert.equal(privateAudio.status, 200);
      assert.deepEqual(privateAudio.bytes, audioBytesV1);

      const bAccess = await requestJson('GET', `/api/submissions/${item1Id}`, { jar: jarB });
      assert.equal(bAccess.status, 404);

      const publicAccess = await requestJson('GET', `/api/collections/${item1Id}`);
      assert.equal(publicAccess.status, 404);
    });

    const returnReason = '音频结尾存在明显杂音，请剪辑后重新上传';

    await step('阶段3', '审核工作台列表/详情、退回原因校验、退回补充及 409 状态冲突校验', async () => {
      const revList = await requestJson('GET', '/api/review/submissions', { jar: jarReviewer });
      assert.equal(revList.status, 200);
      const revItems = (
        revList.json as {
          items: Array<{ id: string; submitter: { username: string } }>;
        }
      ).items;
      const target = revItems.find((it) => it.id === item1Id);
      assert.ok(target, '审核列表中应包含待审核条目');
      assert.equal(target.submitter.username, usernameA);

      const revDetail = await requestJson('GET', `/api/review/submissions/${item1Id}`, {
        jar: jarReviewer,
      });
      assert.equal(revDetail.status, 200);
      assert.equal((revDetail.json as { logs: unknown[] }).logs.length, 0);

      const shortReturn = await requestJson('POST', `/api/review/submissions/${item1Id}/return`, {
        jar: jarReviewer,
        body: { reason: '太短' },
      });
      assert.equal(shortReturn.status, 400);

      const retOk = await requestJson('POST', `/api/review/submissions/${item1Id}/return`, {
        jar: jarReviewer,
        body: { reason: returnReason },
      });
      assert.equal(retOk.status, 200);
      assert.equal((retOk.json as { status: string }).status, 'needs_changes');

      const retAgain = await requestJson('POST', `/api/review/submissions/${item1Id}/return`, {
        jar: jarReviewer,
        body: { reason: returnReason },
      });
      assert.equal(retAgain.status, 409);

      const pubOnNeedsChanges = await requestJson(
        'POST',
        `/api/review/submissions/${item1Id}/publish`,
        { jar: jarReviewer }
      );
      assert.equal(pubOnNeedsChanges.status, 409);
    });

    const audioBytesV2 = makePatternBytes(4096, 55);
    const visualBytesV2 = makePatternBytes(1024, 99);
    const updatedTitle = '阿婆讲端午（高清修订版）';

    await step('阶段2/3', '查看退回原因、B 越权 PATCH 404、A 修改重提（附带图片和 3 句字幕）及重复 PATCH 409', async () => {
      const myList = await requestJson('GET', '/api/my-submissions', { jar: jarA });
      assert.equal(myList.status, 200);
      const itemSummary = (
        myList.json as {
          items: Array<{ id: string; status: string; lastReview: { reason: string } | null }>;
        }
      ).items.find((it) => it.id === item1Id);
      assert.ok(itemSummary);
      assert.equal(itemSummary.status, 'needs_changes');
      assert.equal(itemSummary.lastReview?.reason, returnReason);

      const bPatch = await requestJson('PATCH', `/api/submissions/${item1Id}`, {
        jar: jarB,
        body: { title: '越权修改' },
      });
      assert.equal(bPatch.status, 404);

      const invalidAuthPatch = await requestJson('PATCH', `/api/submissions/${item1Id}`, {
        jar: jarA,
        body: { recordingAuthorized: false },
      });
      assert.equal(invalidAuthPatch.status, 400);

      const signBoth = await requestJson('POST', '/api/uploads/sign', {
        jar: jarA,
        body: {
          audio: { fileName: 'story_v2.m4a', mimeType: 'audio/mp4', sizeBytes: audioBytesV2.byteLength },
          visual: { type: 'image', fileName: 'cover.webp', mimeType: 'image/webp', sizeBytes: visualBytesV2.byteLength },
        },
      });
      assert.equal(signBoth.status, 200);
      const signed = signBoth.json as {
        audio: { path: string; uploadUrl: string };
        visual: { path: string; uploadUrl: string };
      };

      const putAudioV2 = await putBinary(signed.audio.uploadUrl, 'audio/mp4', audioBytesV2);
      assert.equal(putAudioV2.status, 200);
      const putVisualV2 = await putBinary(signed.visual.uploadUrl, 'image/webp', visualBytesV2);
      assert.equal(putVisualV2.status, 200);

      const patchRes = await requestJson('PATCH', `/api/submissions/${item1Id}`, {
        jar: jarA,
        body: {
          title: updatedTitle,
          audio: { path: signed.audio.path, durationSeconds: 45 },
          visual: { type: 'image', path: signed.visual.path },
          subtitleSegments: [
            { start: 0, text: '五月五，过端午' },
            { start: 2.5, text: '门口插艾草' },
            { start: 5.0, text: '阿婆包碱水粽' },
          ],
          submitterCredit: { mode: 'nickname', name: '阿禾' },
        },
      });
      assert.equal(patchRes.status, 200);
      assert.equal((patchRes.json as { status: string }).status, 'pending');

      const patchAgain = await requestJson('PATCH', `/api/submissions/${item1Id}`, {
        jar: jarA,
        body: { title: '不能二次重提' },
      });
      assert.equal(patchAgain.status, 409);
    });

    await step('阶段3', '审核员通过并发布（200）、核对完整审核日志序列及重复发布 409', async () => {
      const pubRes = await requestJson('POST', `/api/review/submissions/${item1Id}/publish`, {
        jar: jarReviewer,
      });
      assert.equal(pubRes.status, 200);
      const pubBody = pubRes.json as { id: string; status: string; publishedAt: string };
      assert.equal(pubBody.status, 'published');
      assert.ok(pubBody.publishedAt.length > 0);

      const revDetail = await requestJson('GET', `/api/review/submissions/${item1Id}`, {
        jar: jarReviewer,
      });
      assert.equal(revDetail.status, 200);
      const logs = (revDetail.json as { logs: Array<{ action: string }> }).logs;
      assert.equal(logs.length, 2);
      assert.equal(logs[0].action, 'return');
      assert.equal(logs[1].action, 'publish');

      const pubAgain = await requestJson('POST', `/api/review/submissions/${item1Id}/publish`, {
        jar: jarReviewer,
      });
      assert.equal(pubAgain.status, 409);
    });

    let publicAudioUrl = '';
    let publicVisualUrl = '';

    await step('阶段4', '公开首页、收藏馆筛选、详情白名单与敏感字段扫描、公开媒体、地图统计一致性', async () => {
      const homeRes = await requestJson('GET', '/api/home');
      assert.equal(homeRes.status, 200);
      const homeBody = homeRes.json as { latest: Array<{ id: string }> };
      assert.ok(homeBody.latest.some((it) => it.id === item1Id), '首页 latest 应包含已发布内容');

      const byRegion = await requestJson('GET', `/api/collections?regionId=${fujianRegionId}`);
      assert.equal(byRegion.status, 200);
      const byRegionBody = byRegion.json as { total: number; items: Array<{ id: string }> };
      assert.equal(byRegionBody.total, 1);
      assert.equal(byRegionBody.items[0].id, item1Id);

      const byKeyword = await requestJson(
        'GET',
        `/api/collections?q=${encodeURIComponent('高清修订版')}`
      );
      assert.equal(byKeyword.status, 200);
      const byKeywordBody = byKeyword.json as { total: number; items: Array<{ id: string }> };
      assert.equal(byKeywordBody.total, 1);
      assert.equal(byKeywordBody.items[0].id, item1Id);

      const detailRes = await requestJson('GET', `/api/collections/${item1Id}`);
      assert.equal(detailRes.status, 200);
      const detail = detailRes.json as {
        visualType: string;
        visualUrl: string;
        audioUrl: string;
        subtitleSegments: unknown[];
        related: unknown[];
      };
      assert.equal(detail.visualType, 'image');
      assert.equal(detail.subtitleSegments.length, 3);
      assert.equal(Array.isArray(detail.related), true);
      publicAudioUrl = detail.audioUrl;
      publicVisualUrl = detail.visualUrl;

      const forbiddenKeys = new Set([
        'submitterId',
        'privateAudioKey',
        'privateVisualKey',
        'status',
        'visibility',
        'logs',
        'recordingAuthorized',
        'username',
      ]);
      assertNoForbiddenDataInPublicJson(homeRes.json, forbiddenKeys, usernameA);
      assertNoForbiddenDataInPublicJson(byRegion.json, forbiddenKeys, usernameA);
      assertNoForbiddenDataInPublicJson(detailRes.json, forbiddenKeys, usernameA);

      const pubAudio = await getBinary(publicAudioUrl);
      assert.equal(pubAudio.status, 200);
      assert.deepEqual(pubAudio.bytes, audioBytesV2);

      const pubVisual = await getBinary(publicVisualUrl);
      assert.equal(pubVisual.status, 200);
      assert.deepEqual(pubVisual.bytes, visualBytesV2);

      const mapRes = await requestJson('GET', '/api/map/regions');
      assert.equal(mapRes.status, 200);
      const mapRows = mapRes.json as Array<{ regionId: string; count: number }>;
      const fujianStat = mapRows.find((row) => row.regionId === fujianRegionId);
      assert.ok(fujianStat, '地图统计应包含福建省');
      assert.equal(fujianStat.count, byRegionBody.total);

      const pubLangs = await requestJson('GET', '/api/languages?scope=public');
      assert.equal(pubLangs.status, 200);
      const langItems = pubLangs.json as Array<{ id: string; count?: number }>;
      assert.ok(langItems.length >= 1 && typeof langItems[0].count === 'number');

      const pubRegions = await requestJson('GET', '/api/regions?scope=public');
      assert.equal(pubRegions.status, 200);
      const regionItems = pubRegions.json as Array<{ id: string; count?: number }>;
      assert.ok(regionItems.length >= 1 && typeof regionItems[0].count === 'number');
    });

    await step('阶段4', '撤回已发布投稿：公开接口 404、公开媒体 404、地图归零、私有文件保留、终态 409', async () => {
      const withdrawRes = await requestJson('POST', `/api/submissions/${item1Id}/withdraw`, {
        jar: jarA,
      });
      assert.equal(withdrawRes.status, 200);
      assert.equal((withdrawRes.json as { status: string }).status, 'withdrawn');

      const withdrawAgain = await requestJson('POST', `/api/submissions/${item1Id}/withdraw`, {
        jar: jarA,
      });
      assert.equal(withdrawAgain.status, 409);

      const detailAfterWithdraw = await requestJson('GET', `/api/collections/${item1Id}`);
      assert.equal(detailAfterWithdraw.status, 404);

      const pubAudioAfter = await getBinary(publicAudioUrl);
      assert.equal(pubAudioAfter.status, 404);
      const pubVisualAfter = await getBinary(publicVisualUrl);
      assert.equal(pubVisualAfter.status, 404);

      const mapAfter = await requestJson('GET', '/api/map/regions');
      assert.equal(mapAfter.status, 200);
      const mapRowsAfter = mapAfter.json as Array<{ regionId: string }>;
      assert.equal(mapRowsAfter.some((row) => row.regionId === fujianRegionId), false);

      const colAfter = await requestJson('GET', `/api/collections?regionId=${fujianRegionId}`);
      assert.equal(colAfter.status, 200);
      assert.equal((colAfter.json as { total: number }).total, 0);

      const myDetailAfter = await requestJson('GET', `/api/submissions/${item1Id}`, { jar: jarA });
      assert.equal(myDetailAfter.status, 200);
      const myDetailBody = myDetailAfter.json as { status: string; audio: { url: string } };
      assert.equal(myDetailBody.status, 'withdrawn');

      const privateAudioAfter = await getBinary(myDetailBody.audio.url);
      assert.equal(privateAudioAfter.status, 200);
      assert.deepEqual(privateAudioAfter.bytes, audioBytesV2);

      const revPubWithdrawn = await requestJson(
        'POST',
        `/api/review/submissions/${item1Id}/publish`,
        { jar: jarReviewer }
      );
      assert.equal(revPubWithdrawn.status, 409);
    });

    await step('阶段4', '撤回 pending 状态投稿（200 withdrawn）', async () => {
      const res = await requestJson('POST', `/api/submissions/${item2Id}/withdraw`, {
        jar: jarA,
      });
      assert.equal(res.status, 200);
      assert.equal((res.json as { status: string }).status, 'withdrawn');
    });

    await step('安全', '登录失败限流校验：同一不存在用户连续 10 次 401，第 11 次返回 429 RATE_LIMITED', async () => {
      const ghostUsername = `ghost_${Date.now()}`;
      for (let i = 1; i <= 10; i++) {
        const res = await requestJson('POST', '/api/auth/login', {
          body: { username: ghostUsername, password: 'any_password_123' },
        });
        assert.equal(res.status, 401, `第 ${i} 次尝试应返回 401`);
      }

      const blocked = await requestJson('POST', '/api/auth/login', {
        body: { username: ghostUsername, password: 'any_password_123' },
      });
      assert.equal(blocked.status, 429);
      assert.equal((blocked.json as { error: { code: string } }).error.code, 'RATE_LIMITED');
    });

    const elapsedMs = Date.now() - startAt;
    console.log(`\n全链路 E2E 测试全部通过：共 ${passedCount} 项断言，耗时 ${elapsedMs}ms`);
  } finally {
    serverProcess.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('E2E 执行失败:', err);
  process.exit(1);
});
