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
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0c]">
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(30, 20, 40, 0.4) 0%, transparent 70%)'
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 bg-[#111113] border border-[#222224] rounded-[22px] p-8 max-w-[380px] w-full shadow-2xl"
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
            className="text-[26px] md:text-[28px] font-bold text-white leading-tight"
          >
            O que realmente ele(a) faz quando tá no Insta?
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-[#8e8e93] text-[15px] leading-relaxed"
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
                style={{ backgroundImage: 'linear-gradient(90deg, #f56040, #fcaf45)' }}
              >
                @
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Digite o @ da pessoa."
                className="w-full h-[48px] bg-[#1a1a1c] border border-[#333336] rounded-full px-12 text-white placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#f56040] transition-all"
              />
              <button
                onClick={handleSubmit}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:opacity-70 transition-opacity"
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#8e8e93]">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-[#8e8e93]">Apenas 1 pesquisa por pessoa.</span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><div className="text-white">Carregando...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
