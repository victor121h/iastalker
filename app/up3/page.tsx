'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatrixBackground from '@/components/MatrixBackground';

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
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      <MatrixBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[480px] w-full bg-[rgba(20,20,20,0.8)] p-10 rounded-[20px] text-center"
          style={{ boxShadow: '0 0 40px rgba(255, 0, 255, 0.2)' }}
        >
          <h1 className="text-[28px] font-bold leading-tight mb-5 text-white">
            Ative sua conta agora
          </h1>
          
          <p className="text-white/90 text-base mb-8">
            Para ativar sua conta e permitir a instalação do aplicativo no seu celular,
            é necessário pagar uma taxa única de <strong>R$27,90</strong>.
            Isso garante que tudo funcione corretamente, sem erros. Esta é uma taxa obrigatória — caso não seja paga, o acesso à conta não será liberado.
          </p>

          <a
            href={appendUtmToLink('https://go.perfectpay.com.br/PPU38CQ49C2')}
            className="inline-block text-white py-4 px-8 rounded-full text-base font-bold no-underline transition-all duration-300 hover:brightness-110"
            style={{ background: 'linear-gradient(90deg, #ff008c, #ffcc33)' }}
          >
            Ativar Conta
          </a>

          <div className="mt-5 text-sm text-white/70">
            Pagamento 100% seguro
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Up3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <Up3Content />
    </Suspense>
  );
}
