'use client';

import { NotificationProvider } from './PurchaseNotification';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}
