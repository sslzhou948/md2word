export type MarkdownToWordRequest = {
  markdown: string;
  templateId: string;
};

export type MarkdownToWordResponse = {
  cleanedMarkdown: string;
  templateId: string;
  filename: string;
  fileBase64: string;
  step?: string; // 当前处理步骤，用于前端进度显示
  wasConverted?: boolean; // 是否进行了文本转Markdown转换
};

export type ErrorResponse = {
  message: string;
  errorCode?: string;
  step?: string;
  details?: string;
};

// 处理步骤枚举（用于前端进度显示）
export type ProcessingStep =
  | '数据输入'
  | '输入检查'
  | '文本转Markdown' // 可选步骤
  | '数据清洗'
  | '匹配模板'
  | '文本生成'
  | '完成';

