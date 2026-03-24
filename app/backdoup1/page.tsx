'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BackdoUp1Content() {
  const searchParams = useSearchParams();
  const [timeLeft, setTimeLeft] = useState({ minutes: 14, seconds: 59 });

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

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.minutes === 0 && prev.seconds === 0) return prev;
        if (prev.seconds === 0) return { minutes: prev.minutes - 1, seconds: 59 };
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0618 50%, #1a0a2e 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(26, 10, 46, 0.95) 0%, rgba(13, 6, 24, 0.98) 100%)',
          border: '1px solid rgba(193, 53, 132, 0.3)',
          boxShadow: '0 0 40px rgba(193, 53, 132, 0.3)',
        }}
      >
        <div className="flex justify-center mb-4">
          <div
            className="text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ background: 'linear-gradient(90deg, #00C853 0%, #00E676 100%)' }}
          >
            <span>🎉</span>
            <span>CONGRATULATIONS</span>
          </div>
        </div>

        <h2 className="text-center text-xl font-bold mb-2">
          <span className="text-white">You are purchase </span>
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853)' }}
          >#1,000!</span>
        </h2>

        <p className="text-sm text-center mb-2" style={{ color: 'rgba(200, 180, 220, 0.6)' }}>
          You earned an extra <span className="text-[#00E676] font-bold">+$20 discount</span> on the Eye of God plan.
        </p>

        <p className="text-xs text-center mb-5" style={{ color: 'rgba(200, 180, 220, 0.4)' }}>
          This exclusive discount won&apos;t be available again.
        </p>

        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-sm" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
            <span>From</span>
            <span className="line-through ml-1">$49.90</span>
          </div>
          <div className="text-center">
            <span className="text-sm" style={{ color: '#00E676' }}>For</span>
            <p className="text-4xl font-bold" style={{ color: '#00E676' }}>$39.90</p>
          </div>
        </div>

        <div className="rounded-xl py-2 px-4 text-center mb-5" style={{ background: 'rgba(0, 255, 117, 0.07)', border: '1px solid rgba(0, 255, 117, 0.25)' }}>
          <p className="text-[#00FF75] text-sm font-semibold">
            You save $20.00 (40% OFF)
          </p>
        </div>

        <div className="mb-5">
          <p className="text-white text-sm font-semibold text-center mb-3 flex items-center justify-center gap-2">
            <span style={{ color: '#00E676' }}>◉</span>
            Ultra Plan – Eye of God Included:
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {['Unlimited profile search', '24h GPS', 'Total anonymity', 'Complete history', 'Real-time notifications', 'WhatsApp Spy', 'Hidden gallery', 'Multiple targets'].map(item => (
              <div key={item} className="flex items-center gap-2" style={{ color: 'rgba(200, 180, 220, 0.7)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#00C853"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <a
          href={appendUtmToLink('https://go.centerpag.com/PPU38CQ99O2')}
          className="block w-full py-3.5 rounded-xl text-center font-bold text-white mb-3"
          style={{
            background: 'linear-gradient(90deg, #00C853 0%, #00E676 50%, #69F0AE 100%)',
            boxShadow: '0 4px 20px rgba(0, 200, 83, 0.4)',
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <span>▶</span>
            GET OFFER AND ACTIVATE
          </span>
        </a>

        <p className="text-xs text-center mb-3" style={{ color: 'rgba(200, 180, 220, 0.4)' }}>
          • This offer expires in: <span className="text-white font-semibold">{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
        </p>

        <a
          href="/dashboard"
          className="text-xs text-center block w-full underline transition-colors"
          style={{ color: 'rgba(200, 180, 220, 0.4)' }}
        >
          No, thanks. I prefer to pay more later.
        </a>
      </motion.div>
    </div>
  );
}

export default function BackdoUp1Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a2e' }}>
        <div style={{ color: 'rgba(200, 180, 220, 0.5)' }}>Loading...</div>
      </div>
    }>
      <BackdoUp1Content />
    </Suspense>
  );
}
