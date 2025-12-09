'use client';

import { motion } from 'framer-motion';
import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DeepGramLogo() {
  return (
    <div className="flex items-center justify-center">
      <img 
        src="/logo-deepgram.png" 
        alt="IA Stalker" 
        className="h-[48px] w-auto"
      />
    </div>
  );
}

function SearchContent() {
  const [username, setUsername] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasVisited = document.cookie.includes('deepgram_visited=true');
    if (hasVisited) {
      const utmParams = getUtmParams();
      if (utmParams) {
        router.replace(`/pitch?${utmParams}`);
      } else {
        router.replace('/pitch');
      }
    }
  }, []);

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const handleSubmit = () => {
    if (username.trim()) {
      const utmParams = getUtmParams();
      const baseParams = `username=${encodeURIComponent(username)}`;
      if (utmParams) {
        router.push(`/confirm?${baseParams}&${utmParams}`);
      } else {
        router.push(`/confirm?${baseParams}`);
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-white to-sky-50">
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(14, 165, 233, 0.1) 0%, transparent 70%)'
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 bg-white border border-sky-200 rounded-[22px] p-8 max-w-[380px] w-full shadow-xl shadow-sky-100/50"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <DeepGramLogo />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="text-[26px] md:text-[28px] font-bold text-slate-800 leading-tight"
          >
            O que realmente ele(a) faz quando tá no Insta?
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-slate-500 text-[15px] leading-relaxed"
          >
            Descubra a verdade sobre qualquer pessoa do Instagram. Só com o @.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="w-full"
          >
            <div className="relative">
              <div 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #0ea5e9, #3b82f6)' }}
              >
                @
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Digite o @ da pessoa."
                className="w-full h-[48px] bg-sky-50 border border-sky-200 rounded-full px-12 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
              />
              <button
                onClick={handleSubmit}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-500 hover:text-sky-600 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="flex items-center gap-2 text-[13px] pt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-slate-500">Apenas 1 pesquisa por pessoa.</span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-white to-sky-50 flex items-center justify-center"><div className="text-slate-600">Carregando...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
