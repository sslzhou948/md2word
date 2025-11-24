import * as fs from 'fs';
import * as path from 'path';

/**
 * 使用日志记录器
 * 
 * 按大小分割日志文件，避免单个文件过大
 */

interface UsageLogEntry {
  ip: string;
  inputLength: number;
  templateId: string;
  result: 'success' | 'error';
  errorCode?: string;
  step?: string;
  duration: number; // 毫秒
  wasConverted?: boolean; // 是否进行了文本转Markdown转换
}

import { appConfig } from '../config/app';

// 配置（从 appConfig 读取）
const LOG_CONFIG = {
  directory: path.join(process.cwd(), appConfig.logging.directory),
  maxFileSize: appConfig.logging.maxFileSize,
  timezone: appConfig.logging.timezone,
  fileNamePrefix: 'usage',
  fileNameSuffix: '.log',
} as const;

/**
 * 确保日志目录存在
 */
function ensureLogDirectory() {
  if (!fs.existsSync(LOG_CONFIG.directory)) {
    fs.mkdirSync(LOG_CONFIG.directory, { recursive: true });
  }
}

/**
 * 获取当前日志文件路径
 */
function getCurrentLogFile(): string {
  ensureLogDirectory();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_CONFIG.directory, `${LOG_CONFIG.fileNamePrefix}-${today}${LOG_CONFIG.fileNameSuffix}`);
}

/**
 * 检查文件大小，如果超过限制则创建新文件
 */
function getLogFileForWriting(): string {
  const currentFile = getCurrentLogFile();
  
  // 如果文件不存在，直接返回
  if (!fs.existsSync(currentFile)) {
    return currentFile;
  }

  // 检查文件大小
  const stats = fs.statSync(currentFile);
  if (stats.size >= LOG_CONFIG.maxFileSize) {
    // 文件过大，创建带时间戳的新文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newFile = path.join(
      LOG_CONFIG.directory,
      `${LOG_CONFIG.fileNamePrefix}-${timestamp}${LOG_CONFIG.fileNameSuffix}`
    );
    return newFile;
  }

  return currentFile;
}

/**
 * 记录使用日志
 */
export function logUsage(entry: UsageLogEntry) {
  try {
    const logFile = getLogFileForWriting();
    const now = new Date();
    const timestampLocal = now.toLocaleString('zh-CN', {
      timeZone: LOG_CONFIG.timezone,
      hour12: false,
    });
    const persistedEntry = {
      timestampLocal,
      timestampUtc: now.toISOString(),
      ...entry,
    };
    const logLine = JSON.stringify(persistedEntry) + '\n';
    
    // 追加写入
    fs.appendFileSync(logFile, logLine, 'utf-8');
  } catch (error) {
    // 日志记录失败不应该影响主流程
    console.error('[日志记录失败]', error);
  }
}

/**
 * 从请求中提取 IP
 */
export function getClientIpFromRequest(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}

