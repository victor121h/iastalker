'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

function DeepGramLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="3"/>
          <path d="M25 25L36 36" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M12 11V14C12 16.2091 13.7909 18 16 18C18.2091 18 20 16.2091 20 14V11C20 8.79086 18.2091 7 16 7C13.7909 7 12 8.79086 12 11Z" fill="url(#lockGradient)"/>
          <rect x="10" y="13" width="12" height="9" rx="2" fill="url(#lockGradient)"/>
          <defs>
            <linearGradient id="lockGradient" x1="10" y1="7" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f56040"/>
              <stop offset="1" stopColor="#fcaf45"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-white font-bold text-xl tracking-tight">Deep</span>
        <span 
          className="font-bold text-xl tracking-tight bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(90deg, #f56040, #fcaf45)' }}
        >
          Gram
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

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
            className="w-full pt-2"
          >
            <button 
              onClick={() => router.push('/search')}
              className="w-full h-[48px] rounded-full font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(90deg, #f56040 0%, #f77737 50%, #fcaf45 100%)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2"/>
                <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2"/>
                <circle cx="18" cy="6" r="1.5" fill="white"/>
              </svg>
              Espionar Agora
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="flex items-center gap-2 text-[13px] pt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#8e8e93]">
              <path d="M19 11H5V21H19V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 11V7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[#8e8e93]">
              100% Anônimo. A pessoa{' '}
              <span 
                className="font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #f56040, #fcaf45)' }}
              >
                NUNCA
              </span>
              {' '}saberá.
            </span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
