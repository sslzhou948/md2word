type EnvKey = 'LLM_API_KEY' | 'LLM_API_BASE_URL' | 'LLM_MODEL';

function readEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`環境變數 ${key} 未設定`);
  }
  return value;
}

export function getLlmConfig() {
  return {
    apiKey: readEnv('LLM_API_KEY'),
    apiBaseUrl: readEnv('LLM_API_BASE_URL').replace(/\/$/, ''),
    model: readEnv('LLM_MODEL'),
  };
}

