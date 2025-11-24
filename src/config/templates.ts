export type TemplateCategory = '公文' | '通用' | '论文' | '标书';

export type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  filename: string;
  previewImage?: string; // 预览图路径（相对于 public 目录，如 "templates/previews/公文模板.png"）
  category?: TemplateCategory; // 模板分类
  disabled?: boolean;
};

export const templateList: TemplateDefinition[] = [
  {
    id: 'style-default',
    name: '通用样式',
    description: '适用于大多数场景的标准 Word 文档样式，包含规范的标题、段落和列表格式。',
    filename: 'style.docx',
    category: '通用',
    previewImage: 'templates/previews/通用样式.svg', // SVG 占位图，可替换为 PNG/JPG
  },
  {
    id: 'official-document',
    name: '公文模板',
    description: '适用于正式公文、报告、通知等场景，符合政府机关和企事业单位的公文格式要求。',
    filename: 'official-document.docx',
    category: '公文',
    previewImage: 'templates/previews/公文模板.svg', // SVG 占位图，可替换为 PNG/JPG
  },
  {
    id: 'academic-paper',
    name: '论文模板',
    description: '适用于学术论文、研究报告、开题报告等场景，包含规范的章节结构和引用格式。',
    filename: 'academic-paper.docx',
    category: '论文',
    previewImage: 'templates/previews/论文模板.svg', // SVG 占位图，可替换为 PNG/JPG
  },
  {
    id: 'coming-soon',
    name: '更多模板（即将推出）',
    description: '放入 templates/ 底下并在此配置即可启用。',
    filename: 'placeholder.docx',
    disabled: true,
  },
];

export function getTemplateById(id: string) {
  return templateList.find((tpl) => tpl.id === id);
}

