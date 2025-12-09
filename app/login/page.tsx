'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const usernameParam = searchParams.get('username') || 'usuario';
  
  const [username, setUsername] = useState(usernameParam);
  const [password, setPassword] = useState('••••••••••');
  const [displayPassword, setDisplayPassword] = useState('');
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('Verificando autenticação...');

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const generateRandomPassword = () => {
    const length = Math.floor(Math.random() * 5) + 8;
    return '*'.repeat(length);
  };

  useEffect(() => {
    if (isLoading) {
      const passwordInterval = setInterval(() => {
        setDisplayPassword(generateRandomPassword());
      }, 80);
      return () => clearInterval(passwordInterval);
    }
  }, [isLoading]);

  const startLoading = useCallback(() => {
    if (isLoading) return;
    
    setIsLoading(true);
    setProgress(0);
    
    const statusMessages = [
      'Verificando autenticação...',
      'Testando combinações de senha...',
      'Analisando hash de segurança...',
      'Decodificando tokens...',
      'Acessando dados do perfil...',
      'Quase lá...',
    ];

    let currentIndex = 0;
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += Math.random() * 12 + 5;
      
      if (currentProgress >= 100) {
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          const utmParams = getUtmParams();
          const baseParams = `username=${encodeURIComponent(usernameParam)}`;
          if (utmParams) {
            router.push(`/feed?${baseParams}&${utmParams}`);
          } else {
            router.push(`/feed?${baseParams}`);
          }
        }, 600);
        return;
      }
      
      setProgress(currentProgress);
      
      const messageIndex = Math.min(
        Math.floor((currentProgress / 100) * statusMessages.length),
        statusMessages.length - 1
      );
      
      if (messageIndex !== currentIndex) {
        currentIndex = messageIndex;
        setStatusText(statusMessages[currentIndex]);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [isLoading, router, usernameParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startLoading();
    }, 500);
    return () => clearTimeout(timer);
  }, [startLoading]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center text-center space-y-8 bg-[#121212] border border-[#262626] rounded-[22px] p-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
          >
            <img src="/logo-instagram.png" alt="Instagram" className="h-[50px] w-auto" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="w-full space-y-2"
          >
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full h-[38px] bg-[#262626] border border-[#262626] rounded-sm px-3 text-xs text-white placeholder:text-[#a8a8a8] focus:outline-none focus:ring-1 focus:ring-[#a8a8a8] transition-all disabled:opacity-70"
            />
            
            <div className="relative">
              <input
                type={isLoading ? "text" : "password"}
                value={isLoading ? displayPassword : password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full h-[38px] bg-[#262626] border border-[#262626] rounded-sm px-3 text-xs text-white placeholder:text-[#a8a8a8] focus:outline-none focus:ring-1 focus:ring-[#a8a8a8] transition-all disabled:opacity-70"
              />
              {isLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="w-full space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 bg-[#262626]/50 rounded-lg p-3 mb-4">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-medium">Quebrando criptografia da conta</div>
                  <div className="text-[#a8a8a8] text-xs">{statusText}</div>
                </div>
              </div>

              <div className="w-full bg-[#262626] rounded-full h-1.5 overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#f56040] via-[#f77737] to-[#fcaf45]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>

            <div className="w-full h-[44px] bg-[#0095f6]/70 text-white rounded-full font-bold text-sm flex items-center justify-center">
              Entrando...
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="text-[#0095f6] text-xs cursor-pointer hover:text-white transition-colors"
          >
            Esqueceu a senha?
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.5 }}
            className="w-full flex items-center gap-4"
          >
            <div className="flex-1 h-px bg-[#262626]"></div>
            <span className="text-[#a8a8a8] text-xs font-semibold">OU</span>
            <div className="flex-1 h-px bg-[#262626]"></div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.6 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 text-[#0095f6] hover:text-white transition-colors text-sm font-semibold"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Entrar com o Facebook
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.7 }}
          className="text-center bg-[#121212] border border-[#262626] rounded-[22px] p-5 text-sm"
        >
          <span className="text-[#e0e0e0]">Não tem uma conta? </span>
          <span className="text-[#0095f6] font-semibold cursor-pointer hover:text-white transition-colors">
            Cadastre-se.
          </span>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginContent />
    </Suspense>
  );
}
