'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getSessionId() {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('_vt_sid');
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('_vt_sid', sid);
  }
  return sid;
}

function getDevice() {
  if (typeof window === 'undefined') return 'unknown';
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function getBrowser() {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastPage = useRef('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pathname === '/useronline') return;

    const sessionId = getSessionId();
    const page = pathname || '/';

    if (page === lastPage.current) return;
    lastPage.current = page;

    const send = (action: string, extra: Record<string, string> = {}) => {
      const body = JSON.stringify({ action, sessionId, page, ...extra });
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/tracking', blob);
      } else {
        fetch('/api/tracking', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    };

    send('enter', {
      device: getDevice(),
      browser: getBrowser(),
      referrer: document.referrer || 'direct',
    });

    const storedName = localStorage.getItem('user_name');
    if (storedName) {
      fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_name', sessionId, name: storedName }),
      }).catch(() => {});
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat', sessionId }),
      }).catch(() => {});
    }, 30000);

    const handleLeave = () => send('leave');
    window.addEventListener('beforeunload', handleLeave);

    return () => {
      window.removeEventListener('beforeunload', handleLeave);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname]);

  return null;
}
