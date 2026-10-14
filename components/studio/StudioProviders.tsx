'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { LanguageProvider } from '@/lib/studio/i18n/client';
import type { Lang } from '@/lib/studio/i18n/define';
import type { PublicUser, StudioPublicConfig } from '@/lib/studio/types';
import { studioApi } from '@/lib/studio/api-client';

interface StudioSessionValue {
  /** The logged-in user (null when logged out). Hydrated from the server on first render. */
  user: PublicUser | null;
  setUser: (user: PublicUser | null) => void;
  /** Updates only the credit balance (e.g. after a generation or a purchase). */
  setCredits: (credits: number) => void;
  /** Re-fetches the user from /api/studio/auth/me. */
  refreshUser: () => Promise<PublicUser | null>;
  config: StudioPublicConfig;
}

const StudioSessionContext = createContext<StudioSessionValue | null>(null);

export function StudioProviders({
  initialLang,
  initialUser,
  config,
  children,
}: {
  initialLang: Lang;
  initialUser: PublicUser | null;
  config: StudioPublicConfig;
  children: ReactNode;
}) {
  const [user, setUser] = useState<PublicUser | null>(initialUser);

  const setCredits = useCallback((credits: number) => {
    setUser((u) => (u ? { ...u, credits } : u));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: fresh } = await studioApi.me();
      setUser(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({ user, setUser, setCredits, refreshUser, config }),
    [user, setCredits, refreshUser, config],
  );

  return (
    <LanguageProvider initialLang={initialUser?.lang ?? initialLang}>
      <StudioSessionContext.Provider value={value}>{children}</StudioSessionContext.Provider>
    </LanguageProvider>
  );
}

export function useStudioSession(): StudioSessionValue {
  const ctx = useContext(StudioSessionContext);
  if (!ctx) throw new Error('useStudioSession must be used inside <StudioProviders>');
  return ctx;
}
