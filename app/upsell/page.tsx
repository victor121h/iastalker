'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MatrixBackground = dynamic(() => import('@/components/MatrixBackground'), { ssr: false });

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
    <div className="min-h-screen bg-[#1a1a1a] relative overflow-x-hidden">
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[420px] w-full bg-[#2a2a2a] rounded-[24px] p-8 text-center border border-[#DC2626]/30"
          style={{ boxShadow: '0 4px 20px rgba(220, 38, 38, 0.2)' }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-[60px] h-[60px] bg-[#DC2626] rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
          </div>

          <h1 className="text-white text-2xl font-bold leading-tight mb-4">
            AI Observer Installation Fee
          </h1>
          
          <p className="text-[#cccccc] text-base mb-6 leading-relaxed">
            A one-time payment of <strong className="text-[#DC2626]">US$34.90</strong> is required for one of our support team to install AI Observer on your phone.
          </p>

          <p className="text-[#999999] text-sm mb-4">
            This ensures everything works correctly and without errors. This fee is mandatory—if it is not paid, account access will not be granted.
          </p>

          <p className="text-[#DC2626] text-sm font-semibold mb-8">
            Attention: Payment of this fee is mandatory for the installation of IA Observer. You will only have access after paying this installation fee.
          </p>

          <a
            href={appendUtmToLink('https://go.centerpag.com/PPU38CQ4OE3')}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-full text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] mb-4 bg-[#DC2626]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            Activate Account
          </a>
        </motion.div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[#666666] text-sm">+8,486 profiles analyzed today</p>
        </div>
      </div>
    </div>
  );
}

export default function UpsellPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
      <UpsellContent />
    </Suspense>
  );
}
