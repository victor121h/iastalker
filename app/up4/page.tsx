'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Up4Content() {
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
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082b 30%, #1c0c30 50%, #200e35 70%, #1a0a2e 100%)' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(138, 43, 226, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 140, 0, 0.08) 0%, transparent 50%)' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[420px] w-full rounded-[24px] p-8 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(30, 15, 50, 0.9) 0%, rgba(20, 10, 35, 0.95) 100%)',
            border: '1px solid rgba(138, 43, 226, 0.2)',
            boxShadow: '0 0 60px rgba(138, 43, 226, 0.15), 0 25px 50px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B2FC9, #C13584)', boxShadow: '0 0 25px rgba(138, 43, 226, 0.3)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
          </div>

          <h1 className="text-white text-2xl font-bold leading-tight mb-6">
            Hosting Fee
          </h1>
          
          <p className="text-base mb-6 leading-relaxed" style={{ color: 'rgba(200, 180, 220, 0.7)' }}>
            Our app is hosted in France, and you live in another country. A currency exchange fee of <span className="font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #C13584, #F77737)' }}>$67.90</span> is required for IA Observer to be allowed to operate in your region.
          </p>

          <p className="text-sm mb-8 leading-relaxed font-semibold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #C13584, #F77737)' }}>
            This fee does not go to IA Observer; it is a mandatory fee in your region for installing apps from abroad.
          </p>

          <a
            href={appendUtmToLink('https://go.centerpag.com/PPU38CQ8ADQ')}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] mb-4"
            style={{
              background: 'linear-gradient(90deg, #8B2FC9 0%, #C13584 40%, #E1306C 60%, #F77737 85%, #FCAF45 100%)',
              boxShadow: '0 4px 20px rgba(193, 53, 132, 0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Pay Exchange Rate
          </a>

          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>100% Anonymous. The person will <span className="font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #C13584, #F77737)' }}>NEVER</span> know.</span>
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-sm" style={{ color: 'rgba(200, 180, 220, 0.3)' }}>+8,486 profiles analyzed today</p>
        </div>
      </div>
    </div>
  );
}

export default function Up4Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#1a0a2e' }} />}>
      <Up4Content />
    </Suspense>
  );
}
