import Link from 'next/link';

import { templateList } from '@/config/templates';
import { ConvertForm } from '@/components/convert-form';
import { Logo } from '@/components/logo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <nav className="border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-lg font-semibold text-neutral-900">md2word</span>
            </Link>
            <Link
              href="/guide"
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
            >
              使用指南
            </Link>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* 价值主张区域 - 紧凑版 */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            让不会排版的人，也能轻松做出专业的 Word 文档
          </h1>
          <p className="text-sm text-neutral-600 sm:text-base">
            从 AI 输出、Markdown 或普通文本，到可直接使用的 Word 文档，只需几步。
          </p>
        </div>

        {/* 转换表单 - 优先展示 */}
        <ConvertForm templates={templateList} />

        {/* 核心功能卡片 - 移到表单下方 */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
            <div className="text-xl">📝</div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">智能识别</h3>
              <p className="text-xs text-neutral-600">
                自动识别 Markdown 或普通文本
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
            <div className="text-xl">🎨</div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">专业模板</h3>
              <p className="text-xs text-neutral-600">
                多种模板可选，适用于各类场景
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
            <div className="text-xl">⚡</div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">快速生成</h3>
              <p className="text-xs text-neutral-600">
                几分钟内完成转换，节省时间
              </p>
            </div>
          </div>
        </div>

        {/* 底部引导 - 更紧凑 */}
        <div className="mt-12 text-center">
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            需要帮助？查看使用指南
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="mt-24 border-t border-neutral-100 bg-neutral-50/50 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-neutral-500">
          <p>md2word · 让文档生成更简单</p>
        </div>
      </footer>
    </div>
  );
}
