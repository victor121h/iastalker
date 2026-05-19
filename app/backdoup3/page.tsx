'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BackdoUp3Content() {
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
          <div className="flex justify-center mb-4">
            <div
              className="text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: 'linear-gradient(90deg, #00C853 0%, #00E676 100%)' }}
            >
              <span>🎉</span>
              <span>EXCLUSIVE DISCOUNT</span>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-[48px] h-[48px] rounded-xl overflow-hidden" style={{ boxShadow: '0 0 25px rgba(138, 43, 226, 0.3)' }}>
              <img src="/ghost-logo.png" alt="AI Ghost" className="w-full h-full object-cover" />
            </div>
          </div>

          <h1 className="text-white text-2xl font-bold leading-tight mb-4">
            FINAL STEP
          </h1>

          <div className="rounded-xl py-3 px-4 text-center mb-6" style={{ background: 'rgba(0, 255, 117, 0.07)', border: '1px solid rgba(0, 255, 117, 0.25)' }}>
            <p className="text-[#00FF75] text-sm font-semibold leading-relaxed">
              You can verify your account for <span className="font-bold">$20 less</span> thanks to your <span className="font-bold">user #1,000</span> discount coupon.
            </p>
          </div>
          
          <p className="text-base mb-6 leading-relaxed" style={{ color: 'rgba(200, 180, 220, 0.7)' }}>
            You need to verify your identity and prove you&apos;re not a robot. We were experiencing hacker attacks on our servers.
          </p>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-sm" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
              <span>From</span>
              <span className="line-through ml-1">$99.90</span>
            </div>
            <div className="text-center">
              <span className="text-sm text-[#00E676]">For</span>
              <p className="text-3xl font-bold text-[#00E676]">$79.90</p>
            </div>
          </div>

          <p className="text-sm mb-8 leading-relaxed font-semibold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #C13584, #F77737)' }}>
            But don&apos;t worry, this amount will be refunded once your account is confirmed in the system.
          </p>

          <a
            href={appendUtmToLink('https://go.centerpag.com/PPU38CQ99O4')}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] mb-4"
            style={{
              background: 'linear-gradient(90deg, #00C853 0%, #00E676 50%, #69F0AE 100%)',
              boxShadow: '0 4px 20px rgba(0, 200, 83, 0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            VERIFY MY ACCOUNT
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

export default function BackdoUp3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#1a0a2e' }} />}>
      <BackdoUp3Content />
    </Suspense>
  );
}
