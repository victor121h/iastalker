'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

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
    router.push('/pitch');
  }, [router]);

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

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-[14px] leading-tight mb-1">
                    No momento o seu acesso só permite visualização do conteúdo.
                  </h3>
                  <p className="text-white/70 text-[12px] leading-snug">
                    Para poder mexer e ver de forma completa adquira a ferramenta do DeepGram.
                  </p>
                </div>

                <button
                  onClick={handlePurchase}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                  style={{ background: '#991B1B' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}
