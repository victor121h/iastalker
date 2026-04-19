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
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 rounded-[22px] p-8 max-w-[380px] w-full"
        style={{
          background: '#121212',
          border: '1px solid #262626',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden">
              <img src="/ghost-logo.png" alt="AI Ghost" className="w-full h-full object-cover" />
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
            className="text-[15px] leading-relaxed text-[#A0A0A0]"
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
                background: 'linear-gradient(135deg, #D62976 0%, #FA7E1E 50%, #FEDA75 100%)',
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
            className="flex items-center gap-2 text-[13px] pt-1 text-[#808080]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 11H5V21H19V11Z"/>
              <path d="M17 11V7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7V11"/>
            </svg>
            <span>
              100% Anonymous. They will{' '}
              <span
                className="font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #D62976, #FA7E1E)' }}
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-[#808080]">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
