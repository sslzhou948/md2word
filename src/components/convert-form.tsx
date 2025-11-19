'use client';

import { useState } from 'react';

import type { TemplateDefinition } from '@/config/templates';
import type { ErrorResponse, MarkdownToWordResponse } from '@/types';

type Props = {
  templates: TemplateDefinition[];
};

const docxMime =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function isLikelyMarkdown(content: string) {
  const value = content.trim();
  if (!value) return false;
  const hashCount = (value.match(/#/g) ?? []).length;
  return hashCount >= 3;
}

function downloadBase64Docx(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: docxMime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ConvertForm({ templates }: Props) {
  const defaultTemplate = templates.find((tpl) => !tpl.disabled)?.id ?? templates[0]?.id;
  const [markdown, setMarkdown] = useState('');
  const [templateId, setTemplateId] = useState(defaultTemplate ?? '');
  const [cleanedMarkdown, setCleanedMarkdown] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<ErrorResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLikelyMarkdown(markdown)) {
      const warning =
        '检测到文本缺少标题或列表等结构，可能不是完整复制的 Markdown 内容。\n\n请回到聊天机器人或 AI 写作工具，使用其提供的“复制”按钮一次性复制整篇原文，再粘贴到此输入框。';
      window.alert(warning);
      setError('文本格式不完整，请按照提示重新复制后再试。');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setErrorDetails(null);
    setStatusMessage('系统正在整理文本并生成 Word，视篇幅约需 5-30 秒，请勿关闭当前页面。');

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown,
          templateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorDetails(errorData);
        throw new Error(errorData?.message ?? '生成失败');
      }

      const data = (await response.json()) as MarkdownToWordResponse;
      setCleanedMarkdown(data.cleanedMarkdown);
      downloadBase64Docx(data.fileBase64, data.filename);
      setStatusMessage('整理完成，Word 文档已下载，您可调整内容后再次生成。');
      setError('');
      setErrorDetails(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误';
      setError(errorMessage);
      // 如果没有详细信息，尝试从错误中提取
      if (!errorDetails && err instanceof Error) {
        setErrorDetails({
          message: errorMessage,
          errorCode: 'NETWORK_ERROR',
          step: '网络请求',
          details: err.message,
        });
      }
      setStatusMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHealthCheck = async () => {
    setHealthLoading(true);
    setHealthStatus(null);
    try {
      const response = await fetch('/api/llm-health');
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.message ?? 'LLM 连接异常');
      }
      setHealthStatus({
        ok: true,
        message: `LLM 正常，延迟约 ${data.latencyMs}ms`,
      });
    } catch (err) {
      setHealthStatus({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'LLM 健康检查失败，请稍后再试或确认接口状态。',
      });
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">文稿处理</p>
        <h1 className="text-2xl font-bold text-neutral-900">快速整理并导出 Word</h1>
        <p className="text-sm text-neutral-500">
          请务必在 AI 工具内点击带有「复制⧉」标识的按钮，一次性复制整篇内容后粘贴到下方输入框，我们会自动整理标题、段落和列表，再导出为可继续编辑的 Word 文档。
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
          要整理的文本
          <textarea
            required
            className="min-h-48 rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
            placeholder="# 标题\n你的内容..."
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
          />
        </label>
        <div className="space-y-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
          <p>💡 使用小贴士：</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>在聊天机器人或 AI 写作工具中，点击其提供的【复制⧉】按钮，一次性复制整篇需要整理的内容。</li>
            <li>直接粘贴到上方“要整理的文本”输入框，不需要保留颜色或字体。</li>
            <li>确认内容完整后，选择需要的模板并点击下方按钮生成 Word 文档。</li>
          </ol>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
          选择模板
          <select
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-neutral-800 focus:border-neutral-400 focus:outline-none"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id} disabled={template.disabled}>
                {template.name} {template.disabled ? '(即将开放)' : ''}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-neutral-500">
            在 templates/ 目录新增 docx 并更新 config/templates.ts 即可扩充。
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {isSubmitting ? '处理中...' : '生成 Word 文档'}
        </button>
        <div className="space-y-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
          <p>⚠ 温馨提醒：</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>生成的 Word 文档已经完成基础排版，但不保证完全零修改。</li>
            <li>建议根据公司统一模板，再检查并微调页眉页脚、标题编号、行距等细节后再正式对外使用。</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={handleHealthCheck}
          disabled={healthLoading}
          className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50"
        >
          {healthLoading ? '检查中...' : '测试 LLM 可用性'}
        </button>

        {error && (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">❌ 生成失败</p>
            <p className="text-sm text-red-700">{error}</p>
            {errorDetails && (
              <div className="mt-3 space-y-1 rounded-lg border border-red-300 bg-white p-3 text-xs">
                {errorDetails.errorCode && (
                  <div className="mb-2">
                    <span className="font-semibold text-neutral-600">故障代码：</span>
                    <span className="ml-2 font-mono font-semibold text-red-600">{errorDetails.errorCode}</span>
                    <span className="ml-2 text-neutral-500">（报修时请提供此代码）</span>
                  </div>
                )}
                {errorDetails.step && (
                  <div>
                    <span className="font-semibold text-neutral-600">失败环节：</span>
                    <span className="ml-2 text-neutral-800">{errorDetails.step}</span>
                  </div>
                )}
                {errorDetails.details && errorDetails.details !== errorDetails.message && (
                  <>
                    <div className="mt-2 border-t border-neutral-200 pt-2">
                      <span className="font-semibold text-neutral-600">详细错误：</span>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-neutral-700">
                      {errorDetails.details}
                    </pre>
                  </>
                )}
                {errorDetails.errorCode === 'CONV_99_TIMEOUT' && (
                  <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                    💡 提示：这通常是 nginx 代理超时限制导致的。请检查 nginx 配置中的 <code className="bg-amber-100 px-1 rounded">proxy_read_timeout</code> 设置（建议 ≥ 300 秒）。
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>

      {statusMessage && (
        <div className="space-y-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          {isSubmitting && (
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <div className="loading-bar h-full w-2/3 rounded-full" />
            </div>
          )}
          <p>{statusMessage}</p>
        </div>
      )}

      {healthStatus && (
        <p
          className={`text-sm ${healthStatus.ok ? 'text-green-600' : 'text-amber-600'}`}
        >
          {healthStatus.message}
        </p>
      )}

      {cleanedMarkdown && (
        <div className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-600">LLM 清洗结果</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-white p-4 text-xs text-neutral-800">
            {cleanedMarkdown}
          </pre>
        </div>
      )}

      <div className="space-y-1 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
        <p className="font-semibold">🔒 隐私与免责声明：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>我们不会刻意留存您粘贴的文本，仅用于本次文档整理与导出。</li>
          <li>请勿粘贴法律法规或公司制度禁止外传的敏感信息，如有疑问请先咨询负责人。</li>
          <li>本工具仅协助完成初步排版，不对文档内容的准确性与完整性承担责任。</li>
        </ul>
      </div>
    </section>
  );
}

