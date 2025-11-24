import { textToMarkdownPromptConfig } from '../config/textToMarkdownPrompt';
import { callChatCompletion } from './llmClient';

/**
 * 判断文本是否已经是 Markdown 格式
 * 
 * 使用简单规则判断：
 * - 包含至少 3 个 # 符号（标题标记）
 * - 或包含 Markdown 列表语法（-、*、+ 或 1.）
 * - 或包含代码块标记（```）
 * - 或包含链接语法（[text](url)）
 */
export function isMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lines = trimmed.split(/\r?\n/).length || 1;
  let score = 0;

  // 代码块或分隔符：基本可以确定是 Markdown
  if (trimmed.includes('```') || trimmed.includes('---\n')) {
    score += 2;
  }

  // 标题数量（# 开头）
  const headingMatches = trimmed.match(/^\s{0,3}#{1,6}\s+/gm)?.length ?? 0;
  if (headingMatches >= 3) {
    score += 2;
  } else if (headingMatches > 0) {
    score += 1;
  }

  // 列表语法（-、*、+、数字.），需要占比较高才认为是 Markdown
  const listMatches = trimmed.match(/^\s{0,3}(?:[-*+]\s+|\d+\.\s+)/gm)?.length ?? 0;
  if (listMatches >= 5 && listMatches / lines > 0.4) {
    score += 1;
  }

  // 链接语法
  const linkMatches = trimmed.match(/\[[^\]]+\]\([^)]+\)/g)?.length ?? 0;
  if (linkMatches >= 2) {
    score += 1;
  }

  // 表格语法
  const tableMatches = trimmed.match(/^\s*\|.*\|\s*$/gm)?.length ?? 0;
  if (tableMatches >= 2) {
    score += 1;
  }

  return score >= 2;
}

/**
 * 将非 Markdown 格式的文本转换为 Markdown
 * 
 * 使用 LLM 将普通文本（如 AI 输出、Word 粘贴文本等）
 * 转换为结构化的 Markdown 格式。
 * 
 * @param text 原始文本
 * @returns 转换后的 Markdown 文本
 */
export async function normalizeToMarkdown(text: string): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error('输入文本不能为空');
  }

  // 如果已经是 Markdown，直接返回
  if (isMarkdown(text)) {
    return text;
  }

  // 调用 LLM 转换为 Markdown
  const markdown = await callChatCompletion({
    messages: [
      { role: 'system', content: textToMarkdownPromptConfig.systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: textToMarkdownPromptConfig.temperature,
  });

  return markdown.trim();
}

/**
 * 文本归一化主函数
 * 
 * 自动判断文本类型，如果不是 Markdown 则转换为 Markdown
 * 
 * @param text 原始文本
 * @returns 归一化后的 Markdown 文本，以及是否需要转换的标记
 */
export async function normalizeText(text: string): Promise<{
  markdown: string;
  wasConverted: boolean; // 是否进行了转换（false 表示原本就是 Markdown）
}> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('输入文本不能为空');
  }

  const isAlreadyMarkdown = isMarkdown(trimmed);

  if (isAlreadyMarkdown) {
    return {
      markdown: trimmed,
      wasConverted: false,
    };
  }

  const converted = await normalizeToMarkdown(trimmed);
  return {
    markdown: converted,
    wasConverted: true,
  };
}

