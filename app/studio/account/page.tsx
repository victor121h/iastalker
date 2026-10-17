'use client';

// /studio/account — client page; data is loaded with studioApi.account() inside AccountView.
// Auth is enforced by the server layout in this segment.
import { AccountView } from '@/components/studio/account/AccountView';

export default function AccountPage() {
  return <AccountView />;
}
