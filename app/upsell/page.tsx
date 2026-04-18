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
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1d3a 30%, #0f1f3d 50%, #102241 70%, #0a1628 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(96, 165, 250, 0.08) 0%, transparent 50%)'
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 rounded-full bg-blue-400/30 animate-pulse" />
        <div className="absolute top-[30%] right-[10%] w-1.5 h-1.5 rounded-full bg-orange-400/25 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[25%] left-[15%] w-1 h-1 rounded-full bg-blue-400/20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-yellow-400/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[15%] right-[30%] w-1 h-1 rounded-full bg-blue-300/25 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 rounded-[22px] p-8 max-w-[420px] w-full text-center"
        style={{
          background: 'linear-gradient(145deg, rgba(10, 22, 40, 0.9) 0%, rgba(13, 29, 58, 0.95) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 0 60px rgba(59, 130, 246, 0.15), 0 0 120px rgba(96, 165, 250, 0.05), 0 25px 50px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex justify-center mb-6">
          <div
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
              boxShadow: '0 0 30px rgba(37, 99, 235, 0.4)',
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

        <p className="text-base mb-6 leading-relaxed" style={{ color: 'rgba(180, 200, 230, 0.7)' }}>
          A one-time payment of{' '}
          <strong
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #2563EB, #3B82F6)' }}
          >US$34.90</strong>{' '}
          is required for one of our support team to install AI Ghost on your phone.
        </p>

        <p className="text-sm mb-4" style={{ color: 'rgba(180, 200, 230, 0.5)' }}>
          This ensures everything works correctly and without errors. This fee is mandatory—if it is not paid, account access will not be granted.
        </p>

        <p className="text-sm font-semibold mb-8 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #2563EB, #3B82F6)' }}>
          Attention: Payment of this fee is mandatory for the installation of AI Ghost. You will only have access after paying this installation fee.
        </p>

        <a
          href={appendUtmToLink('https://go.centerpag.com/PPU38CQ9UM9')}
          className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-200 hover:opacity-90 active:scale-[0.98] mb-4"
          style={{
            background: 'linear-gradient(90deg, #1E40AF 0%, #2563EB 40%, #1D4ED8 60%, #3B82F6 85%, #60A5FA 100%)',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          Activate Account
        </a>

        <p className="text-sm" style={{ color: 'rgba(180, 200, 230, 0.35)' }}>+8,486 profiles analyzed today</p>
      </motion.div>
    </main>
  );
}

export default function UpsellPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1628' }}>
        <div style={{ color: 'rgba(180, 200, 230, 0.5)' }}>Loading...</div>
      </div>
    }>
      <UpsellContent />
    </Suspense>
  );
}
