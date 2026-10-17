// Server-only: provider registry.
import { studioEnv } from '../env';
import { falProvider } from './fal';
import { mockProvider } from './mock';
import type { AIProvider, ProviderName } from './types';

export * from './types';

export function isProviderName(value: unknown): value is ProviderName {
  return value === 'fal' || value === 'mock';
}

/** Provider by name (as stored on a generation row), or null for an unknown name. */
export function getProvider(name: string): AIProvider | null {
  if (name === 'fal') return falProvider;
  if (name === 'mock') return mockProvider;
  return null;
}

/** The provider new generations are submitted to: fal when FAL_KEY is set (or forced), else mock. */
export function getActiveProvider(): AIProvider {
  return studioEnv.aiProvider() === 'fal' ? falProvider : mockProvider;
}
