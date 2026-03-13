'use client';

import { motion, useAnimation } from 'framer-motion';
import { useCallback, createContext, useContext, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface NotificationContextType {
  showNotification: () => void;
  barHeight: number;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

const BAR_PAGES = ['/feed', '/direct', '/chat1', '/chat2', '/chat3'];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const controls = useAnimation();
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);

  const showOnThisPage = BAR_PAGES.some(p => pathname === p || pathname.startsWith(p + '?'));

  useEffect(() => {
    if (!showOnThisPage) {
      setBarHeight(0);
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setBarHeight(el.offsetHeight);
    });
    observer.observe(el);
    setBarHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, [showOnThisPage, pathname]);

  const showNotification = useCallback(async () => {
    if (!showOnThisPage) return;
    await controls.start({
      x: [0, -10, 10, -10, 10, -6, 6, -3, 3, 0],
      transition: { duration: 0.5, ease: 'easeInOut' },
    });
  }, [controls, showOnThisPage]);

  const handlePurchase = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/pitch?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <NotificationContext.Provider value={{ showNotification, barHeight }}>
      {showOnThisPage && (
        <motion.div
          ref={barRef}
          animate={controls}
          className="fixed top-0 left-0 right-0 z-[10000] bg-[#C62828] px-4 py-2.5 text-center cursor-pointer select-none"
          onClick={handlePurchase}
          style={{ boxShadow: '0 2px 12px rgba(198,40,40,0.6)' }}
        >
          <p className="text-white text-xs font-medium leading-snug">
            In the free trial we limit your access. To get full access to everything, get the IA Observer tool.
          </p>
          <p className="text-white font-bold text-xs mt-0.5 underline underline-offset-2">
            Click here to unlock everything
          </p>
        </motion.div>
      )}
      {children}
    </NotificationContext.Provider>
  );
}
