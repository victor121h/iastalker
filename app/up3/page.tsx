'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MatrixBackground = dynamic(() => import('@/components/MatrixBackground'), { ssr: false });

function Up3Content() {
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
    <div className="min-h-screen bg-[#E8F4FC] relative overflow-x-hidden">
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[420px] w-full bg-white rounded-[24px] p-8 text-center"
          style={{ boxShadow: '0 4px 20px rgba(74, 144, 217, 0.15)' }}
        >
          <div className="flex justify-center mb-6">
            <img src="/logo-deepgram-header.png" alt="IA Observer" className="h-[40px] w-auto" />
          </div>

          <h1 className="text-[#1a1a1a] text-2xl font-bold leading-tight mb-6">
            FINAL STEP
          </h1>
          
          <p className="text-[#666666] text-base mb-6 leading-relaxed">
            You need to verify your identity and prove you're not a robot. We were experiencing hacker attacks on our servers.
          </p>

          <p className="text-[#1a1a1a] text-lg font-bold mb-4">
            Verification Fee: <span className="text-[#4A90D9]">$39.90</span>
          </p>

          <p className="text-[#4A90D9] text-sm mb-8 leading-relaxed font-semibold">
            But don't worry, this amount will be refunded once your account is confirmed in the system.
          </p>

          <a
            href={appendUtmToLink('https://go.centerpag.com/PPU38CQ4Q8H')}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] mb-4 bg-[#4A90D9]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            VERIFY MY ACCOUNT
          </a>

          <div className="flex items-center justify-center gap-2 text-[#888888] text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>100% Anonymous. The person will <span className="text-[#4A90D9] font-bold">NEVER</span> know.</span>
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[#888888] text-sm">+8,486 profiles analyzed today</p>
        </div>
      </div>
    </div>
  );
}

export default function Up3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E8F4FC]" />}>
      <Up3Content />
    </Suspense>
  );
}
