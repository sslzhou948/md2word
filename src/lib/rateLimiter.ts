/**
 * 频率限制器
 * 
 * 使用内存 Map 记录 IP 和调用时间，实现简单的频率限制
 * 区分"文本转Markdown"和"Markdown清洗"两个步骤
 */

type RateLimitKey = 'textToMarkdown' | 'markdownClean';

interface RateLimitRecord {
  count: number;
  resetTime: number; // 重置时间戳（毫秒）
}

// 内存存储：IP -> 步骤类型 -> 记录
const rateLimitStore = new Map<string, Map<RateLimitKey, RateLimitRecord>>();

import { appConfig } from '../config/app';

// 配置（从 appConfig 读取）
const RATE_LIMIT_CONFIG = appConfig.rateLimit;

/**
 * 获取客户端 IP
 */
function getClientIp(request: Request): string {
  // 优先从 X-Forwarded-For 获取（nginx 反向代理）
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // 从 X-Real-IP 获取
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 默认返回 localhost（开发环境）
  return '127.0.0.1';
}

/**
 * 检查是否超过频率限制
 * 
 * @param request 请求对象
 * @param step 步骤类型
 * @returns 如果超过限制返回错误信息，否则返回 null
 */
export function checkRateLimit(
  request: Request,
  step: RateLimitKey
): { exceeded: boolean; message?: string; retryAfter?: number } {
  const ip = getClientIp(request);
  const config = RATE_LIMIT_CONFIG[step];
  const now = Date.now();

  // 获取或创建该 IP 的记录
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, new Map());
  }
  const ipRecords = rateLimitStore.get(ip)!;

  // 获取或创建该步骤的记录
  let record = ipRecords.get(step);
  if (!record || now > record.resetTime) {
    // 创建新记录或重置过期记录
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    ipRecords.set(step, record);
  }

  // 检查是否超过限制
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000); // 秒
    return {
      exceeded: true,
      message: `请求过于频繁，${step === 'textToMarkdown' ? '文本转Markdown' : 'Markdown清洗'}步骤每分钟最多 ${config.maxRequests} 次，请 ${retryAfter} 秒后再试。`,
      retryAfter,
    };
  }

  // 增加计数
  record.count += 1;
  return { exceeded: false };
}

/**
 * 清理过期的记录（定期调用，避免内存泄漏）
 */
export function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [ip, records] of rateLimitStore.entries()) {
    for (const [step, record] of records.entries()) {
      if (now > record.resetTime) {
        records.delete(step);
      }
    }
    // 如果该 IP 的所有记录都已过期，删除 IP 记录
    if (records.size === 0) {
      rateLimitStore.delete(ip);
    }
  }
}

// 每 5 分钟清理一次过期记录
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000);
}

