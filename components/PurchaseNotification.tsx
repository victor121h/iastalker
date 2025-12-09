'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface NotificationContextType {
  showNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  const hideNotification = useCallback(() => {
    setIsVisible(false);
  }, []);

  const showNotification = useCallback(() => {
    if (timerId) {
      clearTimeout(timerId);
    }
    setIsVisible(true);
    const newTimerId = setTimeout(() => {
      setIsVisible(false);
    }, 6000);
    setTimerId(newTimerId);
  }, [timerId]);

  const handleClose = useCallback(() => {
    if (timerId) {
      clearTimeout(timerId);
    }
    setIsVisible(false);
  }, [timerId]);

  const handlePurchase = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/pitch?${params.toString()}`);
  }, [router, searchParams]);

  useEffect(() => {
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [timerId]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed top-4 inset-x-0 mx-auto z-[9999] max-w-[380px]"
            style={{ width: 'calc(100% - 32px)' }}
          >
            <div 
              className="relative rounded-[14px] p-4 pr-14 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              }}
            >
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div>
                <div className="flex-1 mb-3">
                  <h3 className="text-white font-bold text-[14px] leading-tight mb-1">
                    No momento o seu acesso só permite visualização do conteúdo.
                  </h3>
                  <p className="text-white/70 text-[12px] leading-snug">
                    Para poder mexer e ver de forma completa adquira a ferramenta do IA Stalker.
                  </p>
                </div>

                <button
                  onClick={handlePurchase}
                  className="w-full py-2.5 rounded-lg font-bold text-[13px] text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#991B1B' }}
                >
                  Assine agora clicando aqui
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}
