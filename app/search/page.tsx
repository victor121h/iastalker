'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DeepGramLogo from '@/components/DeepGramLogo';
import MatrixBackground from '@/components/MatrixBackground';

export default function SearchPage() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  const handleSubmit = () => {
    if (username.trim()) {
      router.push(`/confirm?username=${encodeURIComponent(username)}`);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <MatrixBackground />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 bg-instagram-card border border-instagram-border rounded-instagram p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <DeepGramLogo />
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-white leading-tight"
          >
            O que realmente ele(a) faz quando tá no Insta?
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-instagram-text-light text-base"
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
              <div className="absolute left-4 top-1/2 -translate-y-1/2 instagram-gradient-text text-xl">
                @
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Digite o @ da pessoa."
                className="w-full h-[42px] bg-instagram-input border border-instagram-border rounded-full px-12 text-white placeholder:text-instagram-text-medium focus:outline-none focus:ring-2 focus:ring-instagram-gradient-pink transition-all"
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
            className="flex items-center gap-2 text-sm text-instagram-text-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-instagram-gradient-pink">
              <path d="M12 9v4M12 17h.01M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Apenas 1 pesquisa por pessoa.</span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
