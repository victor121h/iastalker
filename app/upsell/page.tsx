'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UpsellContent() {
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

  const appendUtmToLink = (baseLink: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      return `${baseLink}?${utmParams}`;
    }
    return baseLink;
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
        className="relative z-10 rounded-[22px] p-8 max-w-[420px] w-full text-center"
        style={{
          background: '#121212',
          border: '1px solid #262626',
        }}
      >
        <div className="flex justify-center mb-6">
          <div
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #D62976, #FA7E1E)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold leading-tight mb-4">
          AI Ghost
        </h1>

        <p className="text-base mb-6 leading-relaxed text-[#A0A0A0]">
          A one-time payment of{' '}
          <strong
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #D62976, #FA7E1E)' }}
          >US$34.90</strong>{' '}
          is required for one of our support team to install AI Ghost on your phone.
        </p>

        <p className="text-sm mb-4 text-[#808080]">
          This ensures everything works correctly and without errors. This fee is mandatory—if it is not paid, account access will not be granted.
        </p>

        <p className="text-sm font-semibold mb-8 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #D62976, #FA7E1E)' }}>
          Attention: Payment of this fee is mandatory for the installation of AI Ghost. You will only have access after paying this installation fee.
        </p>

        <a
          href={appendUtmToLink('https://go.centerpag.com/PPU38CQ9UM9')}
          className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-200 hover:opacity-90 active:scale-[0.98] mb-4"
          style={{
            background: 'linear-gradient(135deg, #D62976 0%, #FA7E1E 50%, #FEDA75 100%)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          Activate Account
        </a>

        <p className="text-sm text-[#666]">+8,486 profiles analyzed today</p>
      </motion.div>
    </main>
  );
}

export default function UpsellPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-[#808080]">Loading...</div>
      </div>
    }>
      <UpsellContent />
    </Suspense>
  );
}
