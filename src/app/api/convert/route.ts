import { NextResponse } from 'next/server';

import { getTemplateById, templateList } from '@/config/templates';
import { cleanMarkdownWithLlm } from '@/lib/markdownCleaner';
import { convertMarkdownToDocx } from '@/lib/pandoc';
import type { MarkdownToWordRequest, MarkdownToWordResponse } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const startTime = Date.now();
  let step = '未知';
  
  try {
    step = '请求解析';
    const body = (await request.json()) as MarkdownToWordRequest;
    const { markdown, templateId } = body;

    step = '输入验证';
    if (!markdown || !markdown.trim()) {
      return NextResponse.json(
        {
          message: 'Markdown 內容不可為空',
          errorCode: 'CONV_01_01',
          step: '输入验证',
        },
        { status: 400 }
      );
    }

    step = '模板选择';
    const selectedTemplate =
      getTemplateById(templateId) ??
      templateList.find((tpl) => !tpl.disabled) ??
      templateList[0];

    if (!selectedTemplate || selectedTemplate.disabled) {
      return NextResponse.json(
        {
          message: '模板不可用，請選擇其他模板',
          errorCode: 'CONV_02_01',
          step: '模板选择',
        },
        { status: 400 }
      );
    }

    step = 'LLM 文本清洗';
    let cleanedMarkdown: string;
    try {
      cleanedMarkdown = await cleanMarkdownWithLlm(markdown);
      console.log(`[LLM] 清洗完成，耗时: ${Date.now() - startTime}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[LLM] 清洗失败:`, errorMessage);
      return NextResponse.json(
        {
          message: `LLM 清洗文本失败: ${errorMessage}`,
          errorCode: 'CONV_03_99',
          step: 'LLM 文本清洗',
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    step = 'Pandoc 转换';
    let docxBuffer: Buffer;
    try {
      docxBuffer = await convertMarkdownToDocx(cleanedMarkdown, selectedTemplate.filename);
      console.log(`[Pandoc] 转换完成，文件大小: ${docxBuffer.length} bytes`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Pandoc] 转换失败:`, errorMessage);
      
      let errorCode = 'CONV_04_99';
      if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
        errorCode = 'CONV_04_02';
      } else if (errorMessage.includes('permission') || errorMessage.includes('EACCES')) {
        errorCode = 'CONV_04_03';
      }
      
      return NextResponse.json(
        {
          message: `Word 文档生成失败: ${errorMessage}`,
          errorCode,
          step: 'Pandoc 转换',
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    step = '响应生成';
    const payload: MarkdownToWordResponse = {
      cleanedMarkdown,
      templateId: selectedTemplate.id,
      filename: `md2word-${Date.now()}.docx`,
      fileBase64: docxBuffer.toString('base64'),
    };

    const totalTime = Date.now() - startTime;
    const responseSize = JSON.stringify(payload).length;
    console.log(`[成功] 总耗时: ${totalTime}ms, 响应大小: ${responseSize} bytes`);

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    const totalTime = Date.now() - startTime;
    console.error(`[错误] 步骤: ${step}, 耗时: ${totalTime}ms, 错误:`, errorMessage);
    
    // 检查是否是超时相关错误
    if (errorMessage.includes('timeout') || errorMessage.includes('超時') || totalTime > 50000) {
      return NextResponse.json(
        {
          message: `请求超时（${totalTime}ms），可能是 nginx 代理超时限制。请检查 nginx 的 proxy_read_timeout 配置。`,
          errorCode: 'CONV_99_TIMEOUT',
          step,
          details: errorMessage,
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      {
        message: `处理过程中发生错误: ${errorMessage}`,
        errorCode: 'CONV_99_99',
        step,
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

