'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const navigateWithParams = (path: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      router.push(`${path}?${utmParams}`);
    } else {
      router.push(path);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082b 30%, #1c0c30 50%, #200e35 70%, #1a0a2e 100%)' }}
    >
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(138, 43, 226, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 140, 0, 0.08) 0%, transparent 50%)'
        }}
      />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 rounded-full bg-purple-400/30 animate-pulse" />
        <div className="absolute top-[30%] right-[10%] w-1.5 h-1.5 rounded-full bg-orange-400/25 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[25%] left-[15%] w-1 h-1 rounded-full bg-pink-400/20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-yellow-400/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[15%] right-[30%] w-1 h-1 rounded-full bg-purple-300/25 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 rounded-[22px] p-8 max-w-[380px] w-full"
        style={{
          background: 'linear-gradient(145deg, rgba(30, 15, 50, 0.9) 0%, rgba(20, 10, 35, 0.95) 100%)',
          border: '1px solid rgba(138, 43, 226, 0.2)',
          boxShadow: '0 0 60px rgba(138, 43, 226, 0.15), 0 0 120px rgba(255, 140, 0, 0.05), 0 25px 50px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 30px rgba(138, 43, 226, 0.3)' }}>
              <img src="/ghost-logo.png" alt="IA Observer" className="w-full h-full object-cover" />
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="text-[26px] md:text-[28px] font-bold leading-tight text-white"
          >
            What do they really do when they&apos;re on Insta?
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-[15px] leading-relaxed"
            style={{ color: 'rgba(200, 180, 220, 0.7)' }}
          >
            Discover the truth about anyone on Instagram. Just with their @.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="w-full pt-2 flex justify-center"
          >
            <button 
              onClick={() => navigateWithParams('/search')}
              className="px-8 h-[48px] rounded-full font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(90deg, #8B2FC9 0%, #C13584 40%, #E1306C 60%, #F77737 85%, #FCAF45 100%)',
                boxShadow: '0 4px 20px rgba(193, 53, 132, 0.4)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2"/>
                <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2"/>
                <circle cx="18" cy="6" r="1.5" fill="white"/>
              </svg>
              Spy Now
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="flex items-center gap-2 text-[13px] pt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
              <path d="M19 11H5V21H19V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 11V7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: 'rgba(200, 180, 220, 0.6)' }}>
              100% Anonymous. They will{' '}
              <span 
                className="font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #C13584, #F77737)' }}
              >
                NEVER
              </span>
              {' '}know.
            </span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a2e' }}>
        <div style={{ color: 'rgba(200, 180, 220, 0.5)' }}>Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
