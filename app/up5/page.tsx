'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Up5Content() {
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
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(220, 38, 38, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(138, 43, 226, 0.08) 0%, transparent 50%)' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[420px] w-full rounded-[24px] p-8 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(40, 12, 20, 0.9) 0%, rgba(25, 10, 30, 0.95) 100%)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            boxShadow: '0 0 60px rgba(220, 38, 38, 0.15), 0 25px 50px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center" style={{ background: 'rgba(220, 38, 38, 0.2)', boxShadow: '0 0 25px rgba(220, 38, 38, 0.2)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
          </div>

          <h1 className="text-white text-2xl font-bold leading-tight mb-4">
            Your verification failed
          </h1>
          
          <p className="text-base mb-4 leading-relaxed" style={{ color: 'rgba(200, 180, 220, 0.7)' }}>
            <strong className="text-[#DC2626]">Reason:</strong> It appears you entered a different email. We have blocked your account for security purposes.
          </p>

          <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
            Please try again. A member of our team will now verify your account and unlock it.
          </p>

          <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
            Click the button below to request the unlock.
          </p>

          <p className="text-sm font-semibold mb-8 text-emerald-400">
            Don&apos;t worry, we will refund both payments.
          </p>

          <a
            href={appendUtmToLink('https://go.centerpag.com/PPU38CQ8MHF')}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] mb-4"
            style={{
              background: 'linear-gradient(90deg, #DC2626 0%, #991B1B 100%)',
              boxShadow: '0 4px 20px rgba(220, 38, 38, 0.35)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Request Unlock
          </a>
        </motion.div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-sm" style={{ color: 'rgba(200, 180, 220, 0.3)' }}>+8,486 profiles analyzed today</p>
        </div>
      </div>
    </div>
  );
}

export default function Up5Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#1a0a2e' }} />}>
      <Up5Content />
    </Suspense>
  );
}
