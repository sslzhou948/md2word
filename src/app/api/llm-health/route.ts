import { NextResponse } from 'next/server';

import { callChatCompletion } from '@/lib/llmClient';

export const runtime = 'nodejs';

export async function GET() {
  const startedAt = Date.now();

  try {
    const content = await callChatCompletion({
      messages: [
        {
          role: 'system',
          content: '你是一個健康檢查助手，僅需回覆 OK。',
        },
        { role: 'user', content: '請回覆 OK。' },
      ],
      temperature: 0,
    });

    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - startedAt,
      sample: content.slice(0, 50),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 502 }
    );
  }
}

