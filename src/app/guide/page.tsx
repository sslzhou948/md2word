import Link from 'next/link';

import { Logo } from '@/components/logo';

export default function GuidePage() {
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
              href="/"
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
            >
              返回首页
            </Link>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* 页面标题 */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-neutral-900">
            使用指南
          </h1>
          <p className="text-lg text-neutral-600">
            快速了解如何使用 md2word 生成专业的 Word 文档
          </p>
        </div>

        {/* 快速开始 */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-neutral-900">快速开始</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                  1
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">准备内容</h3>
              </div>
              <p className="ml-11 text-neutral-600">
                你可以直接粘贴文本内容（支持 Markdown 或普通文本），也可以上传 .md、.markdown 或 .txt 文件。
                系统会自动识别文本类型，如果不是 Markdown 格式，会自动转换为 Markdown。
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                  2
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">选择模板</h3>
              </div>
              <p className="ml-11 text-neutral-600">
                根据你的使用场景选择合适的 Word 模板。我们提供了通用样式、公文模板、论文模板等多种选择。
                每个模板都有预览图，方便你选择最合适的样式。
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                  3
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">生成文档</h3>
              </div>
                <p className="ml-11 text-neutral-600">
                  点击「生成 Word 文档」按钮，系统会自动处理你的文本并生成 Word 文档。
                处理过程中会显示当前进度，完成后文档会自动下载。
              </p>
            </div>
          </div>
        </section>

        {/* 常见问题 */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-neutral-900">常见问题</h2>
          <div className="space-y-4">
            <details className="group rounded-xl border border-neutral-200 bg-white">
              <summary className="cursor-pointer p-6 font-semibold text-neutral-900 transition-colors hover:text-neutral-600">
                什么是 Markdown？怎么获取 Markdown 文档？
              </summary>
              <div className="border-t border-neutral-100 p-6 pt-4 text-neutral-600">
                <p className="mb-3">
                  Markdown 是一种用符号表达结构的轻量级标记语言，示例：
                </p>
                <pre className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800">
{`# 项目目标

## 背景
- 梳理现状
- 识别机会

## 关键指标
1. 销售额 +20%
2. 成本 -15%`}
                </pre>
                <p className="mt-3">
                  获取方式：
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>ChatGPT、DeepSeek、豆包等 AI 工具通常提供「复制 Markdown」按钮，请务必使用该按钮。</li>
                  <li>Cherry Studio：在回答卡片右上角选择 <strong>更多 → 导出 Markdown</strong>，可复制或下载 <code>.md</code> 文件。</li>
                  <li>Obsidian、Notion、语雀等写作工具也支持导出 Markdown，只要保留 <code>#</code>、<code>-</code>、<code>1.</code> 等标记即可。</li>
                </ul>
                <p className="mt-2">
                  如暂时只有普通文本，也可以直接粘贴或上传 <code>.txt</code> 文件，我们会自动尝试结构化，但耗时和 Tokens 会稍多。
                </p>
              </div>
            </details>

            <details className="group rounded-xl border border-neutral-200 bg-white">
              <summary className="cursor-pointer p-6 font-semibold text-neutral-900 transition-colors hover:text-neutral-600">
                支持哪些输入格式？
              </summary>
              <div className="border-t border-neutral-100 p-6 pt-4 text-neutral-600">
                <p className="mb-2">
                  我们支持以下输入方式：
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Markdown 格式文本（直接粘贴）</li>
                  <li>普通文本（会自动转换为 Markdown）</li>
                  <li>AI 聊天输出（会自动清理并结构化）</li>
                  <li>文件上传（.md、.markdown、.txt 文件）</li>
                </ul>
              </div>
            </details>

            <details className="group rounded-xl border border-neutral-200 bg-white">
              <summary className="cursor-pointer p-6 font-semibold text-neutral-900 transition-colors hover:text-neutral-600">
                单次可以处理多少字？
              </summary>
              <div className="border-t border-neutral-100 p-6 pt-4 text-neutral-600">
                <p>
                  单次最多支持 10,000 字。如果内容较长，建议分批处理。
                  你可以在输入框下方看到当前字数和限制提示。
                </p>
              </div>
            </details>

            <details className="group rounded-xl border border-neutral-200 bg-white">
              <summary className="cursor-pointer p-6 font-semibold text-neutral-900 transition-colors hover:text-neutral-600">
                生成的 Word 文档可以直接使用吗？
              </summary>
              <div className="border-t border-neutral-100 p-6 pt-4 text-neutral-600">
                <p className="mb-2">
                  生成的 Word 文档已经完成基础排版，但建议你根据实际需求进行微调：
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>检查页眉页脚是否符合要求</li>
                  <li>调整标题编号和格式</li>
                  <li>检查行距、段落间距等细节</li>
                  <li>根据公司统一模板进行最终调整</li>
                </ul>
              </div>
            </details>

            <details className="group rounded-xl border border-neutral-200 bg-white">
              <summary className="cursor-pointer p-6 font-semibold text-neutral-900 transition-colors hover:text-neutral-600">
                处理速度如何？
              </summary>
              <div className="border-t border-neutral-100 p-6 pt-4 text-neutral-600">
                <p>
                  处理速度取决于文本长度、格式复杂度以及后台排队情况。请预留充足时间，尤其是长文档。经验值如下（建议量大按上限估算）：
                </p>
                <ul className="ml-4 list-disc space-y-1 mt-2">
                  <li>短文本（≤ 1000 字）：约 1-2 分钟</li>
                  <li>中等文本（1000-5000 字）：约 3-5 分钟</li>
                  <li>长文本（5000-10000 字）：约 5-8 分钟</li>
                  <li>超长文本（&gt; 10000 字，需分批）：每批次可长达 8-12 分钟</li>
                </ul>
                <p className="mt-2">
                  处理过程中会显示实时进度与耗时，请耐心等待，全程请勿刷新或关闭页面，否则需要重新排队。
                </p>
              </div>
            </details>

            <details className="group rounded-xl border border-neutral-200 bg-white">
              <summary className="cursor-pointer p-6 font-semibold text-neutral-900 transition-colors hover:text-neutral-600">
                遇到错误怎么办？
              </summary>
              <div className="border-t border-neutral-100 p-6 pt-4 text-neutral-600">
                <p className="mb-2">
                  如果生成失败，系统会显示详细的错误信息，包括：
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>故障代码（报修时请提供此代码）</li>
                  <li>失败环节（哪个步骤出现了问题）</li>
                  <li>详细错误信息</li>
                  <li>可能的解决方案提示</li>
                </ul>
                <p className="mt-2">
                  根据错误提示进行排查，如果问题持续，请联系技术支持并提供故障代码。
                </p>
              </div>
            </details>
          </div>
        </section>

        {/* 演示视频区域（预留） */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-neutral-900">演示视频</h2>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-12 text-center">
            <div className="mb-4 text-4xl">🎥</div>
            <p className="mb-2 text-lg font-semibold text-neutral-900">演示视频即将上线</p>
            <p className="text-sm text-neutral-600">
              我们正在准备详细的使用演示视频，敬请期待
            </p>
            {/* 预留视频嵌入位置 */}
            {/* 
            <div className="mt-6 aspect-video w-full rounded-lg bg-neutral-200">
              <iframe
                className="h-full w-full rounded-lg"
                src="YOUR_VIDEO_URL"
                title="使用演示"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            */}
          </div>
        </section>

        {/* 返回首页 */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回首页
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

