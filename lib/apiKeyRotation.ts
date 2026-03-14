export function getNextApiKey(): string {
  const key = process.env.HIKERAPI_ACCESS_KEY;
  if (key) return key;
  throw new Error('No API keys configured');
}

export function getApiKeyWithFallback(): { key: string; tryNext: () => string | null } {
  const key = process.env.HIKERAPI_ACCESS_KEY;
  if (key) {
    return { key, tryNext: () => null };
  }
  throw new Error('No API keys configured');
}
