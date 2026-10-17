import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import './studio.css';
import { StudioProviders } from '@/components/studio/StudioProviders';
import { getCurrentUser } from '@/lib/studio/auth';
import { studioEnv } from '@/lib/studio/env';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { BRAND_NAME } from '@/lib/studio/plans';
import type { PublicUser } from '@/lib/studio/types';

const sans = Inter({ subsets: ['latin'], variable: '--font-studio-sans', display: 'swap' });
const display = Sora({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-studio-display', display: 'swap' });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — Exclusive AI images & videos`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: 'Turn any idea into exclusive AI images and videos in seconds. Chat-based creation with reference images.',
  robots: { index: true, follow: true },
  icons: { icon: '/studio/favicon.png', apple: '/studio/logo-mark.webp' },
  openGraph: { images: ['/studio/logo.webp'] },
};

export const viewport: Viewport = {
  themeColor: '#0A0507',
  colorScheme: 'dark',
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const lang = getRequestLang();
  let user: PublicUser | null = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('[studio] Could not load session:', err);
  }

  return (
    <div className={`${sans.variable} ${display.variable} studio-root min-h-screen font-studio text-studio-text`}>
      <StudioProviders initialLang={lang} initialUser={user} config={studioEnv.publicConfig()}>
        {children}
      </StudioProviders>
    </div>
  );
}
