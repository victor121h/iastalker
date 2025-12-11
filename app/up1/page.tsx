'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatrixBackground from '@/components/MatrixBackground';

function Up1Content() {
  const searchParams = useSearchParams();
  const [timeLeft, setTimeLeft] = useState({ minutes: 14, seconds: 59 });
  const [showPopup, setShowPopup] = useState(false);
  const [popupTimer, setPopupTimer] = useState({ minutes: 4, seconds: 45 });

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
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const popupTimeout = setTimeout(() => {
      setShowPopup(true);
    }, 15000);
    return () => clearTimeout(popupTimeout);
  }, []);

  useEffect(() => {
    if (!showPopup) return;
    const timer = setInterval(() => {
      setPopupTimer(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showPopup]);

  const plans = [
    {
      id: 'ultra',
      name: 'Plano Ultra – Olho de Deus',
      badge: 'DESCONTO: 90% off',
      badgeColor: 'bg-green-500',
      borderColor: 'border-[#00FF75]',
      price: '129,90',
      oldPrice: '230,00',
      savings: '100,10',
      access: 7,
      features: [
        { text: 'Acessar todos os dados do perfil pesquisado', included: true },
        { text: 'Localização em tempo real', included: true },
        { text: 'Histórico de localização', included: true },
        { text: 'Mensagens (enviadas e recebidas) em tempo real', included: true },
        { text: 'Histórico de mensagens (até 18 meses)', included: true },
        { text: 'Acesso vitalício ao IA Stalker', included: true },
        { text: 'Pesquisas ilimitadas de perfis', included: true },
        { text: 'Suporte prioritário 24h', included: true },
      ],
      link: 'https://go.perfectpay.com.br/PPU38CQ4FRQ',
      recommended: true,
    },
    {
      id: 'premium',
      name: 'Plano Premium',
      badge: 'Desconto: 80% off',
      badgeColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      price: '79,90',
      oldPrice: '120,00',
      savings: '40,10',
      access: 5,
      features: [
        { text: 'Acessar todos os dados do perfil pesquisado', included: true },
        { text: 'Localização em tempo real', included: true },
        { text: 'Histórico de localização', included: true },
        { text: 'Mensagens (enviadas e recebidas) em tempo real', included: true },
        { text: 'Histórico de mensagens (até 18 meses)', included: false },
        { text: 'Acesso vitalício ao IA Stalker', included: false },
        { text: 'Pesquisas ilimitadas de perfis', included: false },
        { text: 'Suporte prioritário 24h', included: false },
      ],
      link: 'https://go.perfectpay.com.br/PPU38CQ4FRR',
      recommended: false,
    },
    {
      id: 'basic',
      name: 'Plano Básico',
      badge: 'Desconto: 90% off',
      badgeColor: 'bg-gray-500',
      borderColor: 'border-gray-500',
      price: '59,90',
      oldPrice: '90,00',
      savings: '30,10',
      access: 3,
      features: [
        { text: 'Acessar todos os dados do perfil pesquisado', included: true },
        { text: 'Localização em tempo real', included: true },
        { text: 'Histórico de localização', included: false },
        { text: 'Mensagens (enviadas e recebidas) em tempo real', included: false },
        { text: 'Histórico de mensagens (até 18 meses)', included: false },
        { text: 'Acesso vitalício ao IA Stalker', included: false },
        { text: 'Pesquisas ilimitadas de perfis', included: false },
        { text: 'Suporte prioritário 24h', included: false },
      ],
      link: 'https://go.perfectpay.com.br/PPU38CQ4FRQ',
      recommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white relative">
      
      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#D6272D] py-2.5 px-4">
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            <span className="text-xl">⚠️</span>
            <span className="text-white text-sm font-medium">SUA SESSÃO EXPIRA EM:</span>
            <div className="flex items-center gap-1">
              <div className="bg-black rounded px-2 py-1">
                <span className="text-white text-lg font-bold">{String(timeLeft.minutes).padStart(2, '0')}</span>
              </div>
              <span className="text-white text-lg font-bold">:</span>
              <div className="bg-black rounded px-2 py-1">
                <span className="text-white text-lg font-bold">{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="pt-20 pb-12 px-4 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#0C1011] rounded-[22px] p-6 mb-6"
          >
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/logo-stalker.png" 
                alt="IA Stalker Logo" 
                className="w-20 h-20 rounded-xl"
              />
            </div>

            <div className="bg-[#0D2818] border border-[#00FF75]/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00FF75] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  <span className="font-bold">Parabéns</span>, seu acesso ao IA Stalker foi garantido, falta apenas <span className="font-bold">1 passo</span> para você poder utilizar a ferramenta de modo completo e espionar qualquer perfil.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[#A0A0A0] text-xs text-center mb-2">Passo 2 de 3 · Ative seu plano</p>
              <div className="w-full bg-[#1A1A1A] rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: '66%',
                    background: 'linear-gradient(90deg, #EB1C8F, #962FBF)'
                  }}
                />
              </div>
            </div>

            <div className="bg-[#2D1A1F] border border-[#EB1C8F]/30 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#E53935">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">
                  <span className="font-bold text-[#EB1C8F]">IMPORTANTE:</span> Se o seu plano não for ativado agora você não irá conseguir espionar nenhum perfil.
                </p>
              </div>
            </div>

            <div className="bg-[#3D1A1A] border border-[#E53935]/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">⚠️</span>
                </div>
                <p className="text-white text-sm">
                  <span className="font-bold text-[#E53935]">Atenção!</span> A não ativação de um dos planos resultará na divulgação da sua espionagem. Isso mesmo, caso você não ative o plano, iremos expor que você espionou a pessoa.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-center mb-6"
          >
            <h2 className="text-xl font-bold">
              <span className="text-black">SELECIONE </span>
              <span className="text-[#EB1C8F]">seu plano abaixo:</span>
            </h2>
          </motion.div>

          <div className="space-y-5">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className={`bg-[#0C1011] rounded-[22px] p-5 border-2 ${plan.borderColor} relative overflow-hidden`}
              >
                <div className={`absolute top-3 right-3 ${plan.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                  {plan.badge}
                </div>

                <h3 className="text-white font-bold text-lg mb-4 pr-24">{plan.name}</h3>

                <div className="space-y-2.5 mb-5">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {feature.included ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#E53935" className="flex-shrink-0 mt-0.5">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                        </svg>
                      )}
                      <p className={`text-sm ${feature.included ? 'text-white' : 'text-[#666]'}`}>{feature.text}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center mb-4">
                  <p className="text-[#666] text-sm line-through mb-1">De: R$ {plan.oldPrice}</p>
                  <p className="text-white text-3xl font-bold">
                    R$ {plan.price.split(',')[0]}<span className="text-xl">,{plan.price.split(',')[1]}</span>
                  </p>
                  <p className="text-[#962FBF] text-sm font-medium mt-1">Economize R$ {plan.savings}</p>
                </div>

                <a
                  href={appendUtmToLink(plan.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3.5 rounded-xl text-center font-bold text-white"
                  style={{
                    background: plan.recommended 
                      ? 'linear-gradient(90deg, #EB1C8F, #FA7E1E)'
                      : plan.id === 'premium' 
                        ? 'linear-gradient(90deg, #F97316, #EA580C)'
                        : '#4B5563'
                  }}
                >
                  SELECIONAR PLANO
                </a>

                <p className="text-[#666] text-xs text-center mt-3">Acesso disponível: {plan.access}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-[#666] text-xs mb-4">Compra 100% Segura - Criptografia SSL</p>
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-2 bg-[#0C1011] rounded-lg px-3 py-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <span className="text-white text-xs">Garantia 30 dias</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0C1011] rounded-lg px-3 py-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/>
                  <path d="M1 10h22"/>
                </svg>
                <span className="text-white text-xs">Pagamento Seguro</span>
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-[380px] rounded-[24px] p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1A1A1A 0%, #0C0C0C 100%)',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              boxShadow: '0 0 40px rgba(235, 28, 143, 0.3), inset 0 0 0 2px rgba(235, 28, 143, 0.3)'
            }}
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-[#EB1C8F] to-[#FA7E1E] text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                <span>⚡</span>
                <span>OFERTA RELÂMPAGO</span>
              </div>
            </div>

            <h2 className="text-center text-xl font-bold mb-2">
              <span className="text-white">Espere! </span>
              <span className="text-[#FA7E1E]">Última Chance</span>
            </h2>

            <p className="text-gray-400 text-sm text-center mb-5">
              Leve o plano mais completo com um desconto que não se repetirá.
            </p>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-gray-500 text-sm">
                <span>De R$</span>
                <span className="line-through ml-1">129,90</span>
              </div>
              <div className="text-center">
                <span className="text-[#FA7E1E] text-sm">Por R$</span>
                <p className="text-[#FA7E1E] text-4xl font-bold">79,90</p>
              </div>
            </div>

            <div className="bg-[#0D2818] border border-[#00FF75]/30 rounded-xl py-2 px-4 text-center mb-5">
              <p className="text-[#00FF75] text-sm font-semibold">
                Você economiza R$ 50,00 (39% OFF)
              </p>
            </div>

            <div className="mb-5">
              <p className="text-white text-sm font-semibold text-center mb-3 flex items-center justify-center gap-2">
                <span className="text-[#FA7E1E]">◉</span>
                Plano Ultra – Olho de Deus Incluso:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Busca ilimitada de perfis</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>GPS 24h</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Anonimato total</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Histórico completo</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Notificações em tempo real</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>WhatsApp Spy</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Galeria oculta</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Múltiplos alvos</span>
                </div>
              </div>
            </div>

            <a
              href={appendUtmToLink('https://go.perfectpay.com.br/PPU38CQ4JEP')}
              className="block w-full py-3.5 rounded-xl text-center font-bold text-white mb-3"
              style={{ background: 'linear-gradient(90deg, #00C853, #00E676)' }}
            >
              <span className="flex items-center justify-center gap-2">
                <span>▶</span>
                ADQUIRIR OFERTA E ATIVAR
              </span>
            </a>

            <p className="text-gray-500 text-xs text-center mb-3">
              • Esta oferta expira em: <span className="text-white font-semibold">{String(popupTimer.minutes).padStart(2, '0')}:{String(popupTimer.seconds).padStart(2, '0')}</span>
            </p>

            <button
              onClick={() => setShowPopup(false)}
              className="text-gray-500 text-xs text-center w-full underline hover:text-gray-400 transition-colors"
            >
              Não, obrigado. Prefiro pagar mais caro depois.
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function Up1Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C1011] flex items-center justify-center"><div className="text-white">Carregando...</div></div>}>
      <Up1Content />
    </Suspense>
  );
}
