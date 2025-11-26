'use client';

import { Suspense } from 'react';
import { NotificationProvider } from './PurchaseNotification';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </Suspense>
  );
}
