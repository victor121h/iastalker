'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MatrixBackground = dynamic(() => import('@/components/MatrixBackground'), { ssr: false });

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

  const closePopup = () => {
    setShowPopup(false);
    setTimeout(() => {
      setShowPopup(true);
      setPopupTimer({ minutes: 4, seconds: 45 });
    }, 22000);
  };

  const plans = [
    {
      id: 'ultra',
      name: 'Ultra Plan – Eye of God',
      badge: 'DISCOUNT: 90% off',
      badgeColor: 'bg-green-500',
      borderColor: 'border-[#00FF75]',
      price: '49.90',
      oldPrice: '230.00',
      savings: '180.10',
      access: 7,
      features: [
        { text: 'Access all data from the searched profile', included: true },
        { text: 'Real-time location', included: true },
        { text: 'Location history', included: true },
        { text: 'Messages (sent and received) in real time', included: true },
        { text: 'Message history (up to 18 months)', included: true },
        { text: 'Lifetime access to IA Observer', included: true },
        { text: 'Unlimited profile searches', included: true },
        { text: '24h priority support', included: true },
      ],
      link: 'https://go.centerpag.com/PPU38CQ4ODO',
      recommended: true,
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      badge: 'Discount: 80% off',
      badgeColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      price: '29.90',
      oldPrice: '120.00',
      savings: '90.10',
      access: 5,
      features: [
        { text: 'Access all data from the searched profile', included: true },
        { text: 'Real-time location', included: true },
        { text: 'Location history', included: true },
        { text: 'Messages (sent and received) in real time', included: true },
        { text: 'Message history (up to 18 months)', included: false },
        { text: 'Lifetime access to IA Observer', included: false },
        { text: 'Unlimited profile searches', included: false },
        { text: '24h priority support', included: false },
      ],
      link: 'https://go.centerpag.com/PPU38CQ4ODN',
      recommended: false,
    },
    {
      id: 'basic',
      name: 'Basic Plan',
      badge: 'Discount: 90% off',
      badgeColor: 'bg-gray-500',
      borderColor: 'border-gray-500',
      price: '19.90',
      oldPrice: '90.00',
      savings: '70.10',
      access: 3,
      features: [
        { text: 'Access all data from the searched profile', included: true },
        { text: 'Real-time location', included: true },
        { text: 'Location history', included: false },
        { text: 'Messages (sent and received) in real time', included: false },
        { text: 'Message history (up to 18 months)', included: false },
        { text: 'Lifetime access to IA Observer', included: false },
        { text: 'Unlimited profile searches', included: false },
        { text: '24h priority support', included: false },
      ],
      link: 'https://go.centerpag.com/PPU38CQ4ODM',
      recommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white relative">
      
      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#D6272D] py-2.5 px-4">
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            <span className="text-xl">⚠️</span>
            <span className="text-white text-sm font-medium">YOUR SESSION EXPIRES IN:</span>
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
                alt="IA Observer Logo" 
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
                  <span className="font-bold">Congratulations</span>, your access to IA Observer has been secured, there's only <span className="font-bold">1 step</span> left so you can use the tool completely and spy on any profile.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[#A0A0A0] text-xs text-center mb-2">Step 2 of 3 - Activate your plan</p>
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
                  <span className="font-bold text-[#EB1C8F]">IMPORTANT:</span> If your plan is not activated now, you won't be able to spy on any profile.
                </p>
              </div>
            </div>

            <div className="bg-[#3D1A1A] border border-[#E53935]/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">⚠️</span>
                </div>
                <p className="text-white text-sm">
                  <span className="font-bold text-[#E53935]">Attention!</span> Not activating one of the plans will result in the disclosure of your spying. That's right, if you don't activate the plan, we will expose that you spied on the person.
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
              <span className="text-black">SELECT </span>
              <span className="text-[#EB1C8F]">your plan below:</span>
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
                  <p className="text-[#666] text-sm line-through mb-1">From: ${plan.oldPrice}</p>
                  <p className="text-white text-3xl font-bold">
                    ${plan.price.split('.')[0]}<span className="text-xl">.{plan.price.split('.')[1]}</span>
                  </p>
                  <p className="text-[#962FBF] text-sm font-medium mt-1">You save ${plan.savings}</p>
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
                  SELECT PLAN
                </a>

                <p className="text-[#666] text-xs text-center mt-3">Access available: {plan.access}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-[#666] text-xs mb-4">100% Secure Purchase - SSL Encryption</p>
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-2 bg-[#0C1011] rounded-lg px-3 py-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <span className="text-white text-xs">30-day guarantee</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0C1011] rounded-lg px-3 py-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/>
                  <path d="M1 10h22"/>
                </svg>
                <span className="text-white text-xs">Secure Payment</span>
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
              onClick={closePopup}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-[#EB1C8F] to-[#FA7E1E] text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                <span>⚡</span>
                <span>FLASH SALE</span>
              </div>
            </div>

            <h2 className="text-center text-xl font-bold mb-2">
              <span className="text-white">Wait! </span>
              <span className="text-[#FA7E1E]">Last Chance</span>
            </h2>

            <p className="text-gray-400 text-sm text-center mb-5">
              Get the most complete plan with a discount that won't be repeated.
            </p>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-gray-500 text-sm">
                <span>From</span>
                <span className="line-through ml-1">$49.90</span>
              </div>
              <div className="text-center">
                <span className="text-[#FA7E1E] text-sm">For</span>
                <p className="text-[#FA7E1E] text-4xl font-bold">$29.90</p>
              </div>
            </div>

            <div className="bg-[#0D2818] border border-[#00FF75]/30 rounded-xl py-2 px-4 text-center mb-5">
              <p className="text-[#00FF75] text-sm font-semibold">
                You save $20.00 (33% OFF)
              </p>
            </div>

            <div className="mb-5">
              <p className="text-white text-sm font-semibold text-center mb-3 flex items-center justify-center gap-2">
                <span className="text-[#FA7E1E]">◉</span>
                Ultra Plan – Eye of God Included:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Unlimited profile search</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>24h GPS</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Total anonymity</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Complete history</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Real-time notifications</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>WhatsApp Spy</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Hidden gallery</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EB1C8F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span>Multiple targets</span>
                </div>
              </div>
            </div>

            <a
              href={appendUtmToLink('https://go.centerpag.com/PPU38CQ4ODN')}
              className="block w-full py-3.5 rounded-xl text-center font-bold text-white mb-3"
              style={{ background: 'linear-gradient(90deg, #00C853, #00E676)' }}
            >
              <span className="flex items-center justify-center gap-2">
                <span>▶</span>
                GET OFFER AND ACTIVATE
              </span>
            </a>

            <p className="text-gray-500 text-xs text-center mb-3">
              • This offer expires in: <span className="text-white font-semibold">{String(popupTimer.minutes).padStart(2, '0')}:{String(popupTimer.seconds).padStart(2, '0')}</span>
            </p>

            <button
              onClick={closePopup}
              className="text-gray-500 text-xs text-center w-full underline hover:text-gray-400 transition-colors"
            >
              No, thanks. I prefer to pay more later.
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function Up1Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C1011] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <Up1Content />
    </Suspense>
  );
}
