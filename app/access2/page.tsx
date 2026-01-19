'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Access2Content() {
  const searchParams = useSearchParams();
  
  const appendUtmToLink = (baseLink: string) => {
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    const utmContent = searchParams.get('utm_content');
    const utmTerm = searchParams.get('utm_term');
    
    const params = new URLSearchParams();
    if (utmSource) params.append('utm_source', utmSource);
    if (utmMedium) params.append('utm_medium', utmMedium);
    if (utmCampaign) params.append('utm_campaign', utmCampaign);
    if (utmContent) params.append('utm_content', utmContent);
    if (utmTerm) params.append('utm_term', utmTerm);
    
    const utmString = params.toString();
    if (utmString) {
      return `${baseLink}${baseLink.includes('?') ? '&' : '?'}${utmString}`;
    }
    return baseLink;
  };

  const purchaseLink = appendUtmToLink('https://go.centerpag.com/PPU38CQ68T0');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-gray-900/80 border border-gray-800 rounded-2xl p-8 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold mb-6">
          Acesso Prioritário
        </h1>

        <p className="text-gray-300 text-base mb-8 leading-relaxed">
          O seu acesso completo estará disponível em 7 dias, porque nosso time configura 1 a 1 manualmente. Se deseja ter prioridade e o seu acesso ser configurado ainda hoje, clique no botão abaixo e solicite a configuração para hoje.
        </p>

        <a
          href={purchaseLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
        >
          Solicitar Configuração Hoje
        </a>

        <p className="text-gray-500 text-sm mt-6">
          Seu acesso será liberado em até 2 horas após a solicitação.
        </p>
      </motion.div>
    </div>
  );
}

export default function Access2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>}>
      <Access2Content />
    </Suspense>
  );
}
