'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatrixBackground from '@/components/MatrixBackground';

function BackFrontContent() {
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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
      <MatrixBackground />
      
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at bottom left, rgba(139, 69, 139, 0.4) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(139, 69, 139, 0.3) 0%, transparent 50%)'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-[#0F0F0F] rounded-3xl p-6 border border-[#222]"
        style={{ 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' 
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #EC4899, #F97316, #FBBF24)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
            </svg>
          </div>
          <div className="flex items-baseline">
            <span className="text-white text-xl font-bold">Deep</span>
            <span 
              className="text-xl font-bold"
              style={{ background: 'linear-gradient(90deg, #EC4899, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              gram
            </span>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold leading-tight">
            <span className="text-white">Oferta </span>
            <span style={{ background: 'linear-gradient(90deg, #EC4899, #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Exclusiva
            </span>
            <span className="text-white"> por </span>
            <span style={{ background: 'linear-gradient(90deg, #EC4899, #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Tempo Limitado!
            </span>
          </h1>
        </div>

        <div className="text-center mb-6">
          <p className="text-[#999] text-sm leading-relaxed">
            Aproveite esta oportunidade única para ter acesso completo à plataforma{' '}
            <span style={{ background: 'linear-gradient(90deg, #EC4899, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' }}>
              DeepGram
            </span>
            {' '}com um desconto especial. Esta oferta está disponível apenas por tempo limitado!
          </p>
        </div>

        <div 
          className="rounded-2xl p-4 mb-4 text-center"
          style={{ background: 'rgba(139, 69, 139, 0.15)', border: '1px solid rgba(139, 69, 139, 0.3)' }}
        >
          <p className="text-[#888] text-sm line-through mb-1">De R$ 59,90</p>
          <p className="text-lg">
            <span className="text-white">Por apenas </span>
            <span 
              className="text-2xl font-bold"
              style={{ background: 'linear-gradient(90deg, #EC4899, #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              R$ 29,90
            </span>
          </p>
        </div>

        <div 
          className="rounded-2xl p-4 mb-6 text-center"
          style={{ background: 'rgba(30, 30, 40, 0.8)', border: '1px solid rgba(60, 60, 80, 0.5)' }}
        >
          <p className="text-white text-sm mb-2">Tempo restante para garantir este desconto</p>
          <p 
            className="text-3xl font-bold"
            style={{ background: 'linear-gradient(90deg, #EC4899, #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            04:58
          </p>
        </div>

        <a
          href={appendUtmToLink("https://go.perfectpay.com.br/PPU38CQ3TJ3")}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 rounded-xl font-bold text-white text-center mb-6 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(90deg, #EC4899, #F97316)' }}
        >
          <span className="flex items-center justify-center gap-2">
            <span>GARANTIR MEU DESCONTO AGORA</span>
            <span>▶</span>
          </span>
        </a>

        <div className="text-center">
          <p className="text-[#777] text-xs leading-relaxed">
            Ao adquirir, você terá acesso <strong className="text-[#999]">completo e imediato</strong> à plataforma. O processamento é instantâneo via <strong className="text-[#999]">PIX</strong> ou <strong className="text-[#999]">Cartão de Crédito</strong>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function BackFrontPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="text-white">Carregando...</div></div>}>
      <BackFrontContent />
    </Suspense>
  );
}
