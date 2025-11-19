import { llmPromptConfig } from '../config/llmPrompt';
import { callChatCompletion } from './llmClient';

export async function cleanMarkdownWithLlm(markdown: string) {
  return callChatCompletion({
    messages: [
      { role: 'system', content: llmPromptConfig.systemPrompt },
      { role: 'user', content: markdown },
    ],
    temperature: llmPromptConfig.temperature,
  });
}

