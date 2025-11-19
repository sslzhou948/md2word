export type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  filename: string;
  disabled?: boolean;
};

export const templateList: TemplateDefinition[] = [
  {
    id: 'style-default',
    name: '預設樣式',
    description: '基於 templates/style.docx 的段落與標題樣式。',
    filename: 'style.docx',
  },
  {
    id: 'coming-soon',
    name: '更多模板（即將推出）',
    description: '放入 templates/ 底下並在此配置即可啟用。',
    filename: 'placeholder.docx',
    disabled: true,
  },
];

export function getTemplateById(id: string) {
  return templateList.find((tpl) => tpl.id === id);
}

