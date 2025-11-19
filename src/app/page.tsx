import { templateList } from '@/config/templates';
import { ConvertForm } from '@/components/convert-form';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-100 px-6 py-12">
      <main className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            md2word
          </p>
          <h1 className="text-3xl font-bold text-neutral-900">AI 文稿一键转成 Word 报告</h1>
          <p className="text-base text-neutral-600">
            把聊天机器人或智能写作工具生成的长文，自动整理成格式规整、方便继续编辑的 Word 文档。
          </p>
        </div>
        <ConvertForm templates={templateList} />
      </main>
    </div>
  );
}
