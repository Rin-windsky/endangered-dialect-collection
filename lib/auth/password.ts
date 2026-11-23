/**
 * 文件职责：封装密码哈希与密码比对（bcryptjs，cost 12，对应技术方案第 3.1 节）。
 */

import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

/**
 * 生成密码的 bcrypt 哈希。
 * 输入：明文密码字符串。
 * 输出：bcrypt 哈希字符串。
 * 业务规则：固定使用 cost=12，不在任何地方保存或打印明文密码。
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

/**
 * 比对明文密码与 bcrypt 哈希。
 * 输入：明文密码 plainPassword 与数据库中的 passwordHash。
 * 输出：匹配返回 true，否则返回 false。
 * 业务规则：供登录校验使用，不对外区分用户不存在还是密码错误。
 */
export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
