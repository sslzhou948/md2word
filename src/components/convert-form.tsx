'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { appConfig } from '@/config/app';
import type { TemplateDefinition } from '@/config/templates';
import type { ErrorResponse, MarkdownToWordResponse, ProcessingStep } from '@/types';

type Props = {
  templates: TemplateDefinition[];
};

const docxMime =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// 处理步骤的中文描述
const stepLabels: Record<ProcessingStep, string> = {
  数据输入: '正在接收输入数据...',
  输入检查: '正在检查输入内容...',
  文本转Markdown: '正在将文本转换为 Markdown 格式...',
  数据清洗: '正在清洗和整理 Markdown...',
  匹配模板: '正在匹配 Word 模板...',
  文本生成: '正在生成 Word 文档...',
  完成: '处理完成！',
};

const stepOrder: ProcessingStep[] = [
  '数据输入',
  '输入检查',
  '文本转Markdown',
  '数据清洗',
  '匹配模板',
  '文本生成',
];

// 字数显示组件
function WordCountDisplay({ count }: { count: number }) {
  const maxLength = appConfig.maxInputLength;
  const isOverLimit = count > maxLength;
  const isNearLimit = count > maxLength * 0.8;

  return (
    <span
      className={`text-xs ${
        isOverLimit
          ? 'font-semibold text-red-600'
          : isNearLimit
          ? 'text-amber-600'
          : 'text-neutral-500'
      }`}
    >
      当前字数：{count.toLocaleString()} / {maxLength.toLocaleString()} 字
      {isOverLimit && '（超出限制）'}
    </span>
  );
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
  const [currentStep, setCurrentStep] = useState<ProcessingStep | null>(null);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<ErrorResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStepTimers = () => {
    stepTimersRef.current.forEach((timer) => clearTimeout(timer));
    stepTimersRef.current = [];
  };

  const startStepProgress = () => {
    clearStepTimers();
    stepOrder.forEach((step, index) => {
      if (index === 0) return;
      const timer = setTimeout(() => {
        setCurrentStep((prev) => {
          if (!prev || prev === '完成') {
            return prev;
          }
          return step;
        });
      }, index * 10000);
      stepTimersRef.current.push(timer);
    });
  };

  useEffect(() => () => {
    clearStepTimers();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  }, []);

  const startElapsedTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setElapsedSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopElapsedTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleFileUpload = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.md', '.markdown', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      setError(`不支持的文件类型。请上传 .md、.markdown 或 .txt 文件。`);
      return;
    }

    try {
      const content = await handleFileUpload(file);
      setMarkdown(content);
      setError('');
      setStatusMessage(`已加载文件：${file.name}`);
      // 清空文件输入，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '文件读取失败';
      setError(errorMessage);
    }
  };

  const handlePasteClick = async () => {
    if (!navigator?.clipboard?.readText) {
      setError('当前浏览器不支持一键粘贴，请使用 Ctrl+V。');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setStatusMessage('剪贴板内容为空，请先复制需要整理的文本。');
        return;
      }
      setMarkdown(text);
      setError('');
      setStatusMessage('已从剪贴板粘贴文本，可继续编辑后生成 Word。');
    } catch (err) {
      console.error('[Clipboard] 粘贴失败', err);
      setError('无法读取剪贴板内容，请授权浏览器访问或使用 Ctrl+V。');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!markdown || !markdown.trim()) {
      setError('请输入要转换的内容');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setErrorDetails(null);
    setCurrentStep('数据输入');
    setStatusMessage('');
    startStepProgress();
    startElapsedTimer();

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown,
          templateId,
        }),
      });

      // 更新进度状态（根据响应中的step字段）
      if (response.ok) {
        const data = (await response.json()) as MarkdownToWordResponse;
        clearStepTimers();
        stopElapsedTimer();
        setCurrentStep(data.step || '完成');
        
        setCleanedMarkdown(data.cleanedMarkdown);
        downloadBase64Docx(data.fileBase64, data.filename);
        
        if (data.wasConverted) {
          setStatusMessage('文本已自动转换为 Markdown 格式，Word 文档已下载。');
        } else {
          setStatusMessage('整理完成，Word 文档已下载，您可调整内容后再次生成。');
        }
        setError('');
        setErrorDetails(null);
        window.dispatchEvent(new Event('user-count-updated'));
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorDetails(errorData);
        clearStepTimers();
        stopElapsedTimer();
        setCurrentStep(errorData.step || null);
        throw new Error(errorData?.message ?? '生成失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误';
      setError(errorMessage);
      clearStepTimers();
      stopElapsedTimer();
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
      setCurrentStep(null);
    } finally {
      clearStepTimers();
      stopElapsedTimer();
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
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-700">
            要整理的文本
          </label>
          <div className="flex flex-col gap-2">
            <textarea
              required
              className="min-h-48 rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
              placeholder="直接粘贴文本内容，或上传 .md/.markdown/.txt 文件...&#10;&#10;支持：&#10;- Markdown 格式文本&#10;- 普通文本（将自动转换为 Markdown）&#10;- AI 聊天输出（将自动清理并结构化）"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
              >
                上传文件 (.md/.markdown/.txt)
              </label>
              <button
                type="button"
                onClick={handlePasteClick}
                className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
              >
                <span aria-hidden>📋</span>
                一键粘贴
              </button>
              {markdown && (
                <WordCountDisplay count={markdown.length} />
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
          <p>💡 使用小贴士：</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>优先粘贴 Markdown 文本，可显著提高转换质量并减少 Token 消耗与等待时间。</li>
            <li>如暂时只有普通文本，也可以粘贴或上传 .txt 文件，我们会自动尝试结构化。</li>
            <li>确认内容完整后，选择需要的模板并点击下方按钮生成 Word 文档。</li>
          </ol>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-700">
            选择模板
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates
              .filter((tpl) => !tpl.disabled)
              .map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setTemplateId(template.id)}
                  className={`group relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                    templateId === template.id
                      ? 'border-neutral-900 bg-neutral-50 shadow-md'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  {/* 预览图 */}
                  {template.previewImage ? (
                    <div className="relative h-32 w-full overflow-hidden rounded-lg bg-neutral-100">
                      <Image
                        src={`/${template.previewImage}`}
                        alt={template.name}
                        width={400}
                        height={300}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          const target = event.currentTarget;
                          target.style.display = 'none';
                          const placeholder = target.parentElement;
                          if (placeholder) {
                            placeholder.innerHTML =
                              '<div class="flex h-full items-center justify-center text-xs text-neutral-400">预览图未上传</div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-400">
                      暂无预览图
                    </div>
                  )}

                  {/* 模板信息 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-900">{template.name}</h3>
                      {templateId === template.id && (
                        <div className="h-2 w-2 rounded-full bg-neutral-900" />
                      )}
                    </div>
                    {template.category && (
                      <span className="text-xs text-neutral-500">{template.category}</span>
                    )}
                    <p className="text-xs text-neutral-600">{template.description}</p>
                  </div>
                </button>
              ))}
          </div>
          {templates.some((tpl) => tpl.disabled) && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center text-xs text-neutral-500">
              更多模板即将上线，敬请期待...
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {isSubmitting ? '处理中...' : '生成 Word 文档'}
        </button>

        {/* 进度状态显示 */}
        {isSubmitting && currentStep && (
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <p className="text-sm font-semibold text-blue-800">
                {stepLabels[currentStep]}
              </p>
            </div>
            {/* 进度条 */}
            <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: currentStep === '数据输入' ? '10%' :
                         currentStep === '输入检查' ? '20%' :
                         currentStep === '文本转Markdown' ? '35%' :
                         currentStep === '数据清洗' ? '50%' :
                         currentStep === '匹配模板' ? '70%' :
                         currentStep === '文本生成' ? '90%' :
                         '100%',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-blue-800">
              <span>已耗时：{elapsedSeconds} 秒</span>
              <span>⚠ 请耐心等待，3-5 分钟内勿刷新或关闭页面</span>
            </div>
          </div>
        )}
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

