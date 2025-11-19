import { getLlmConfig } from './env';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 750;

function parseRetryAfterMs(headerValue: string | null) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (!Number.isFinite(seconds)) return null;
  return seconds * 1000;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callChatCompletion({
  messages,
  temperature = 0,
}: {
  messages: ChatMessage[];
  temperature?: number;
}) {
  const { apiKey, apiBaseUrl, model } = getLlmConfig();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('LLM 回傳資料無內容');
      }

      return content.trim();
    }

    const errorText = await response.text();

    const isRetryable = RETRYABLE_STATUS.has(response.status);
    const isLastAttempt = attempt === MAX_RETRIES - 1;

    if (!isRetryable || isLastAttempt) {
      throw new Error(`LLM 請求失敗: ${response.status} ${errorText}`);
    }

    const retryAfter =
      parseRetryAfterMs(response.headers.get('retry-after')) ??
      BASE_DELAY_MS * 2 ** attempt;
    await delay(retryAfter);
  }

  throw new Error('LLM 請求失敗: 達到重試上限');
}

