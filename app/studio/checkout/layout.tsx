import type { Metadata } from 'next';
import { SiteFooter } from '@/components/studio/SiteFooter';
import { SiteHeader } from '@/components/studio/SiteHeader';

// Chrome only — no auth guard here: the success page must also work for logged-out visitors
// (each page checks the session itself).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
