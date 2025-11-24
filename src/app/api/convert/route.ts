import { NextResponse } from 'next/server';

import { appConfig } from '@/config/app';
import { getTemplateById, templateList } from '@/config/templates';
import { cleanMarkdownWithLlm } from '@/lib/markdownCleaner';
import { convertMarkdownToDocx } from '@/lib/pandoc';
import { checkRateLimit } from '@/lib/rateLimiter';
import { normalizeText } from '@/lib/textNormalizer';
import { incrementUserCount } from '@/lib/stats';
import { getClientIpFromRequest, logUsage } from '@/lib/usageLogger';
import type { MarkdownToWordRequest, MarkdownToWordResponse, ProcessingStep } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const startTime = Date.now();
  let step: ProcessingStep = '数据输入';
  let requestBody: MarkdownToWordRequest | null = null; // 保存请求体，用于错误日志
  
  try {
    // 步骤 1: 数据输入（请求解析）
    step = '数据输入';
    const body = (await request.json()) as MarkdownToWordRequest;
    requestBody = body; // 保存请求体
    const { markdown, templateId } = body;

    // 步骤 2: 输入检查
    step = '输入检查';
    if (!markdown || !markdown.trim()) {
      return NextResponse.json(
        {
          message: '输入内容不可为空',
          errorCode: 'CONV_01_01',
          step: '输入检查',
        },
        { status: 400 }
      );
    }

    // 字数上限检查
    const inputLength = markdown.length;
    if (inputLength > appConfig.maxInputLength) {
      return NextResponse.json(
        {
          message: `输入内容过长（${inputLength.toLocaleString()} 字），单次最多支持 ${appConfig.maxInputLength.toLocaleString()} 字，请分批处理。`,
          errorCode: 'CONV_01_02',
          step: '输入检查',
        },
        { status: 400 }
      );
    }

    // 频率限制检查（文本转Markdown步骤）
    const textToMarkdownRateLimit = checkRateLimit(request, 'textToMarkdown');
    if (textToMarkdownRateLimit.exceeded) {
      return NextResponse.json(
        {
          message: textToMarkdownRateLimit.message,
          errorCode: 'CONV_01_03',
          step: '输入检查',
          details: `请在 ${textToMarkdownRateLimit.retryAfter} 秒后重试`,
        },
        { status: 429 }
      );
    }

    // 步骤 3: 文本归一化（可选，如果不是Markdown则转换）
    let normalizedMarkdown: string;
    let wasConverted = false;
    
    try {
      const normalizeResult = await normalizeText(markdown);
      normalizedMarkdown = normalizeResult.markdown;
      wasConverted = normalizeResult.wasConverted;
      
      if (wasConverted) {
        step = '文本转Markdown';
        console.log(`[文本归一化] 已转换为Markdown，耗时: ${Date.now() - startTime}ms`);
      } else {
        console.log(`[文本归一化] 输入已是Markdown格式，跳过转换`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[文本归一化] 失败:`, errorMessage);
      return NextResponse.json(
        {
          message: `文本转换失败: ${errorMessage}`,
          errorCode: 'CONV_02_99',
          step: '文本转Markdown',
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    // 步骤 4: 匹配模板
    step = '匹配模板';
    const selectedTemplate =
      getTemplateById(templateId) ??
      templateList.find((tpl) => !tpl.disabled) ??
      templateList[0];

    if (!selectedTemplate || selectedTemplate.disabled) {
      return NextResponse.json(
        {
          message: '模板不可用，請選擇其他模板',
          errorCode: 'CONV_02_01',
          step: '匹配模板',
        },
        { status: 400 }
      );
    }

    // 频率限制检查（Markdown清洗步骤）
    const markdownCleanRateLimit = checkRateLimit(request, 'markdownClean');
    if (markdownCleanRateLimit.exceeded) {
      return NextResponse.json(
        {
          message: markdownCleanRateLimit.message,
          errorCode: 'CONV_03_01',
          step: '数据清洗',
          details: `请在 ${markdownCleanRateLimit.retryAfter} 秒后重试`,
        },
        { status: 429 }
      );
    }

    // 步骤 5: 数据清洗（LLM清洗Markdown）
    step = '数据清洗';
    let cleanedMarkdown: string;
    try {
      cleanedMarkdown = await cleanMarkdownWithLlm(normalizedMarkdown);
      console.log(`[LLM] 清洗完成，耗时: ${Date.now() - startTime}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[LLM] 清洗失败:`, errorMessage);
      
      // 记录错误日志
      const clientIp = getClientIpFromRequest(request);
      logUsage({
        ip: clientIp,
        inputLength,
        templateId: selectedTemplate.id,
        result: 'error',
        errorCode: 'CONV_03_99',
        step: '数据清洗',
        duration: Date.now() - startTime,
        wasConverted,
      });
      
      return NextResponse.json(
        {
          message: `LLM 清洗文本失败: ${errorMessage}`,
          errorCode: 'CONV_03_99',
          step: '数据清洗',
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    // 步骤 6: 文本生成（Pandoc转换）
    step = '文本生成';
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

    // 步骤 7: 完成
    step = '完成';
    const totalTime = Date.now() - startTime;
    const payload: MarkdownToWordResponse = {
      cleanedMarkdown,
      templateId: selectedTemplate.id,
      filename: `md2word-${Date.now()}.docx`,
      fileBase64: docxBuffer.toString('base64'),
      step: '完成',
      wasConverted,
    };

    const responseSize = JSON.stringify(payload).length;
    console.log(`[成功] 总耗时: ${totalTime}ms, 响应大小: ${responseSize} bytes, 是否转换: ${wasConverted}`);

    // 记录成功日志
    const clientIp = getClientIpFromRequest(request);
    logUsage({
      ip: clientIp,
      inputLength,
      templateId: selectedTemplate.id,
      result: 'success',
      duration: totalTime,
      wasConverted,
    });
    try {
      await incrementUserCount();
    } catch (statsError) {
      console.error('[Stats] 增加计数失败', statsError);
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    const totalTime = Date.now() - startTime;
    console.error(`[错误] 步骤: ${step}, 耗时: ${totalTime}ms, 错误:`, errorMessage);
    
    // 记录错误日志
    try {
      const clientIp = getClientIpFromRequest(request);
      logUsage({
        ip: clientIp,
        inputLength: requestBody?.markdown?.length || 0,
        templateId: requestBody?.templateId || 'unknown',
        result: 'error',
        errorCode: 'CONV_99_99',
        step,
        duration: totalTime,
      });
    } catch (logError) {
      // 日志记录失败不影响错误返回
      console.error('[日志记录失败]', logError);
    }
    
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

