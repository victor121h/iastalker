let requestCounter = 0;

export function getNextApiKey(): string {
  const keys = [
    process.env.HIKERAPI_KEY_1,
    process.env.HIKERAPI_KEY_2,
    process.env.HIKERAPI_KEY_3,
    process.env.HIKERAPI_KEY_4,
    process.env.HIKERAPI_KEY_5,
    process.env.HIKERAPI_KEY_6,
    process.env.HIKERAPI_KEY_7,
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    const legacyKey = process.env.HIKERAPI_ACCESS_KEY;
    if (legacyKey) return legacyKey;
    throw new Error('No API keys configured');
  }

  const keyIndex = requestCounter % keys.length;
  requestCounter++;
  
  return keys[keyIndex];
}

export function getApiKeyWithFallback(): { key: string; tryNext: () => string | null } {
  const keys = [
    process.env.HIKERAPI_KEY_1,
    process.env.HIKERAPI_KEY_2,
    process.env.HIKERAPI_KEY_3,
    process.env.HIKERAPI_KEY_4,
    process.env.HIKERAPI_KEY_5,
    process.env.HIKERAPI_KEY_6,
    process.env.HIKERAPI_KEY_7,
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    const legacyKey = process.env.HIKERAPI_ACCESS_KEY;
    if (legacyKey) {
      return { key: legacyKey, tryNext: () => null };
    }
    throw new Error('No API keys configured');
  }

  const startIndex = requestCounter % keys.length;
  requestCounter++;
  
  let attempts = 0;
  
  return {
    key: keys[startIndex],
    tryNext: () => {
      attempts++;
      if (attempts >= keys.length) return null;
      const nextIndex = (startIndex + attempts) % keys.length;
      return keys[nextIndex];
    }
  };
}
