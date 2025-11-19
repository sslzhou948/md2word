export type MarkdownToWordRequest = {
  markdown: string;
  templateId: string;
};

export type MarkdownToWordResponse = {
  cleanedMarkdown: string;
  templateId: string;
  filename: string;
  fileBase64: string;
};

export type ErrorResponse = {
  message: string;
  errorCode?: string;
  step?: string;
  details?: string;
};

