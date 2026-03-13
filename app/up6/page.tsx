'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Up6Content() {
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

  const plans = [
    {
      id: 'ultra',
      name: 'Ultra Plan – Eye of God',
      badge: 'DISCOUNT: 90% off',
      badgeColor: 'bg-green-500',
      borderColor: 'border-[#00FF75]',
      price: '79.90',
      oldPrice: '230.00',
      savings: '150.10',
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
      link: 'https://go.centerpag.com/PPU38CQ8AC2',
      recommended: true,
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      badge: 'Discount: 80% off',
      badgeColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      price: '59.90',
      oldPrice: '120.00',
      savings: '60.10',
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
      link: 'https://go.centerpag.com/PPU38CQ8AC1',
      recommended: false,
    },
    {
      id: 'basic',
      name: 'Basic Plan',
      badge: 'Discount: 90% off',
      badgeColor: 'bg-gray-500',
      borderColor: 'border-gray-500',
      price: '49.90',
      oldPrice: '90.00',
      savings: '40.10',
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
      link: 'https://go.centerpag.com/PPU38CQ89MK',
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

            <div className="text-center mb-6">
              <h1 className="text-white text-xl font-bold mb-1">Mobile Installation Fee</h1>
              <div className="w-12 h-0.5 bg-[#EB1C8F] mx-auto mt-2" />
            </div>

            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 mb-5">
              <p className="text-[#A0A0A0] text-sm leading-relaxed">
                You purchased IA Observer for <span className="text-white font-semibold">desktop</span> and we detected that you are accessing via <span className="text-white font-semibold">mobile</span>.
              </p>
              <p className="text-[#A0A0A0] text-sm leading-relaxed mt-3">
                It is <span className="text-white font-semibold">mandatory</span> that you choose one of the plans below to activate your account on mobile. If you do not complete the activation, <span className="text-white font-semibold">you will not be able to access IA Observer</span>.
              </p>
            </div>

            <div className="bg-[#1C1A0D] border border-[#F59E0B]/40 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">👆</span>
                <div>
                  <p className="text-[#A0A0A0] text-sm">
                    <span className="text-white font-semibold">Current plan:</span> Eye of God – $29.90
                  </p>
                  <p className="text-[#F59E0B] text-xs mt-1.5 leading-relaxed">
                    This amount will be refunded as soon as you activate your new plan.
                  </p>
                </div>
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

                <p className="text-[#A0A0A0] text-xs text-center mt-3 leading-relaxed">
                  The $30 from your desktop plan will be refunded after you purchase the mobile plan.
                </p>
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
    </div>
  );
}

export default function Up6Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C1011] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <Up6Content />
    </Suspense>
  );
}
