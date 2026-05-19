'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BackUp1Content() {
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
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(139, 69, 139, 0.3) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(139, 69, 139, 0.2) 0%, transparent 50%)'
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring" }}
        className="relative w-full max-w-md bg-[#1A1A1A] rounded-3xl p-6 border border-[#333]"
        style={{ 
          boxShadow: '0 0 80px rgba(236, 72, 153, 0.3), 0 0 40px rgba(139, 69, 139, 0.2)' 
        }}
      >
        <button className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors text-xl">
          ×
        </button>

        <div className="flex justify-center mb-4">
          <div 
            className="px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2"
            style={{ background: 'linear-gradient(90deg, #F97316, #EA580C)' }}
          >
            <span>🔥</span>
            <span className="text-white">FLASH SALE</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-white">Wait! </span>
            <span style={{ background: 'linear-gradient(90deg, #EC4899, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Last Chance
            </span>
          </h1>
          <p className="text-[#888] text-sm">
            Get the most complete plan with a discount that won't be repeated.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-[#666] text-xs">From $</p>
            <p className="text-[#666] text-lg line-through">39.90</p>
          </div>
          <div className="text-center">
            <p className="text-white text-lg">For $</p>
            <p className="text-white text-4xl font-bold">14.90</p>
          </div>
        </div>

        <div 
          className="rounded-full py-2 px-4 text-center mb-6"
          style={{ background: 'linear-gradient(90deg, #EC4899, #F97316)' }}
        >
          <span className="text-white font-bold text-sm">You save $25.00 (63% OFF)</span>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white">⚫</span>
            <span className="text-white font-bold text-sm">Ultra Plan – Eye of God Included:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">Unlimited profile search</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">24h GPS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">Total anonymity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">Complete history</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">Real-time notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">WhatsApp Spy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">Hidden gallery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#EC4899]">✓</span>
              <span className="text-[#CCC]">Multiple targets</span>
            </div>
          </div>
        </div>

        <a
          href={appendUtmToLink("https://go.perfectpay.com.br/PPU38CQ3TH7")}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 rounded-xl font-bold text-white text-center mb-4 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(90deg, #EC4899, #F97316)' }}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="bg-purple-600 rounded px-1">▶</span>
            <span>GET OFFER AND ACTIVATE</span>
          </span>
        </a>

        <div className="text-center mb-3">
          <p className="text-[#888] text-xs flex items-center justify-center gap-1">
            <span>⏱</span>
            <span>This offer expires in 04:57</span>
          </p>
        </div>

        <div className="text-center">
          <a href="#" className="text-[#888] text-xs underline hover:text-[#AAA] transition-colors">
            No thanks. I prefer to pay more later.
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default function BackUp1Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <BackUp1Content />
    </Suspense>
  );
}
