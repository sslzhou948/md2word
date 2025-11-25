/**
 * 应用配置
 * 
 * 集中管理应用级别的配置项，便于按需调整
 */

export const appConfig = {
  // 输入字数限制
  maxInputLength: 10000, // 单次最多支持的字数

  // 频率限制配置
  rateLimit: {
    textToMarkdown: {
      maxRequests: 5, // 每分钟最多请求次数
      windowMs: 60 * 1000, // 时间窗口（毫秒）
    },
    markdownClean: {
      maxRequests: 10, // 每分钟最多请求次数
      windowMs: 60 * 1000, // 时间窗口（毫秒）
    },
  },

  // 日志配置
  logging: {
    maxFileSize: 10 * 1024 * 1024, // 10MB，日志文件最大大小
    directory: 'logs', // 日志目录（相对于项目根目录）
    timezone: 'Asia/Shanghai' as const, // 日志时间采用的时区
  },
} as const;

