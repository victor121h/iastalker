'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.location.href = '/backdoup1';
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
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
      price: '69.90',
      oldPrice: '230.00',
      savings: '180.10',
      access: 7,
      features: [
        { text: 'Access all data from the searched profile', included: true },
        { text: 'Real-time location', included: true },
        { text: 'Location history', included: true },
        { text: 'Messages (sent and received) in real time', included: true },
        { text: 'Message history (up to 18 months)', included: true },
        { text: 'Lifetime access to AI Ghost', included: true },
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
      price: '49.90',
      oldPrice: '120.00',
      savings: '90.10',
      access: 5,
      features: [
        { text: 'Access all data from the searched profile', included: true },
        { text: 'Real-time location', included: true },
        { text: 'Location history', included: true },
        { text: 'Messages (sent and received) in real time', included: true },
        { text: 'Message history (up to 18 months)', included: false },
        { text: 'Lifetime access to AI Ghost', included: false },
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
      price: '39.90',
      oldPrice: '90.00',
      savings: '70.10',
      access: 3,
      features: [
        { text: 'Access all data from the searched profile', included: true },
        { text: 'Real-time location', included: true },
        { text: 'Location history', included: false },
        { text: 'Messages (sent and received) in real time', included: false },
        { text: 'Message history (up to 18 months)', included: false },
        { text: 'Lifetime access to AI Ghost', included: false },
        { text: 'Unlimited profile searches', included: false },
        { text: '24h priority support', included: false },
      ],
      link: 'https://go.centerpag.com/PPU38CQ89MK',
      recommended: false,
    },
  ];

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1d3a 30%, #0f1f3d 50%, #102241 70%, #0a1628 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(96, 165, 250, 0.08) 0%, transparent 50%)'
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 rounded-full bg-blue-400/30 animate-pulse" />
        <div className="absolute top-[30%] right-[10%] w-1.5 h-1.5 rounded-full bg-orange-400/25 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[25%] left-[15%] w-1 h-1 rounded-full bg-blue-400/20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-yellow-400/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[15%] right-[30%] w-1 h-1 rounded-full bg-blue-300/25 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 py-2.5 px-4" style={{ background: 'linear-gradient(90deg, #1E40AF 0%, #2563EB 40%, #1D4ED8 60%, #3B82F6 85%, #60A5FA 100%)' }}>
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            <span className="text-xl">⚠️</span>
            <span className="text-white text-sm font-medium">YOUR SESSION EXPIRES IN:</span>
            <div className="flex items-center gap-1">
              <div className="rounded px-2 py-1" style={{ background: 'rgba(0,0,0,0.35)' }}>
                <span className="text-white text-lg font-bold">{String(timeLeft.minutes).padStart(2, '0')}</span>
              </div>
              <span className="text-white text-lg font-bold">:</span>
              <div className="rounded px-2 py-1" style={{ background: 'rgba(0,0,0,0.35)' }}>
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
            className="rounded-[22px] p-6 mb-6"
            style={{
              background: 'linear-gradient(145deg, rgba(10, 22, 40, 0.9) 0%, rgba(13, 29, 58, 0.95) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              boxShadow: '0 0 60px rgba(59, 130, 246, 0.12), 0 25px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)' }}>
                <img src="/ghost-logo.png" alt="AI Ghost Logo" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(0, 255, 117, 0.07)', border: '1px solid rgba(0, 255, 117, 0.25)' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00FF75] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  <span className="font-bold">Congratulations</span>, your access to AI Ghost has been secured, there&apos;s only <span className="font-bold">1 step</span> left so you can use the tool completely and spy on any profile.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-center mb-2" style={{ color: 'rgba(180, 200, 230, 0.6)' }}>Step 2 of 3 - Activate your plan</p>
              <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '66%',
                    background: 'linear-gradient(90deg, #1E40AF, #2563EB)',
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">
                  <span className="font-bold" style={{ color: '#2563EB' }}>IMPORTANT:</span> If your plan is not activated now, you won&apos;t be able to spy on any profile.
                </p>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(247, 119, 55, 0.1)', border: '1px solid rgba(247, 119, 55, 0.3)' }}>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">⚠️</span>
                </div>
                <p className="text-white text-sm">
                  <span className="font-bold" style={{ color: '#3B82F6' }}>Attention!</span> Not activating one of the plans will result in the disclosure of your spying. That&apos;s right, if you don&apos;t activate the plan, we will expose that you spied on the person.
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
              <span className="text-white">SELECT </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #2563EB, #3B82F6)' }}
              >your plan below:</span>
            </h2>
          </motion.div>

          <div className="space-y-5">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className={`rounded-[22px] p-5 border-2 ${plan.borderColor} relative overflow-hidden`}
                style={{
                  background: 'linear-gradient(145deg, rgba(10, 22, 40, 0.9) 0%, rgba(13, 29, 58, 0.95) 100%)',
                  boxShadow: '0 0 40px rgba(59, 130, 246, 0.08), 0 20px 40px rgba(0,0,0,0.3)',
                }}
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
                  <p className="text-sm font-medium mt-1" style={{ color: '#2563EB' }}>You save ${plan.savings}</p>
                </div>

                <a
                  href={appendUtmToLink(plan.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3.5 rounded-xl text-center font-bold text-white"
                  style={{
                    background: plan.recommended
                      ? 'linear-gradient(90deg, #1E40AF 0%, #2563EB 40%, #1D4ED8 60%, #3B82F6 85%, #60A5FA 100%)'
                      : plan.id === 'premium'
                        ? 'linear-gradient(90deg, #F97316, #EA580C)'
                        : '#4B5563',
                    boxShadow: plan.recommended ? '0 4px 20px rgba(37, 99, 235, 0.4)' : undefined,
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
            <p className="text-sm mb-4" style={{ color: 'rgba(180, 200, 230, 0.4)' }}>100% Secure Purchase - SSL Encryption</p>
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(10, 22, 40, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <span className="text-white text-xs">30-day guarantee</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(10, 22, 40, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
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
              background: 'linear-gradient(145deg, rgba(10, 22, 40, 0.97) 0%, rgba(13, 29, 58, 0.99) 100%)',
              border: '1px solid rgba(37, 99, 235, 0.4)',
              boxShadow: '0 0 40px rgba(37, 99, 235, 0.3)',
            }}
          >
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 transition-colors"
              style={{ color: 'rgba(180, 200, 230, 0.5)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="flex justify-center mb-4">
              <div
                className="text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: 'linear-gradient(90deg, #1E40AF 0%, #2563EB 40%, #3B82F6 100%)' }}
              >
                <span>⚡</span>
                <span>FLASH SALE</span>
              </div>
            </div>

            <h2 className="text-center text-xl font-bold mb-2">
              <span className="text-white">Wait! </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #2563EB, #3B82F6)' }}
              >Last Chance</span>
            </h2>

            <p className="text-sm text-center mb-5" style={{ color: 'rgba(180, 200, 230, 0.6)' }}>
              Get the most complete plan with a discount that won&apos;t be repeated.
            </p>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-sm" style={{ color: 'rgba(180, 200, 230, 0.5)' }}>
                <span>From</span>
                <span className="line-through ml-1">$69.90</span>
              </div>
              <div className="text-center">
                <span className="text-sm" style={{ color: '#3B82F6' }}>For</span>
                <p className="text-4xl font-bold" style={{ color: '#3B82F6' }}>$49.90</p>
              </div>
            </div>

            <div className="rounded-xl py-2 px-4 text-center mb-5" style={{ background: 'rgba(0, 255, 117, 0.07)', border: '1px solid rgba(0, 255, 117, 0.25)' }}>
              <p className="text-[#00FF75] text-sm font-semibold">
                You save $20.00 (33% OFF)
              </p>
            </div>

            <div className="mb-5">
              <p className="text-white text-sm font-semibold text-center mb-3 flex items-center justify-center gap-2">
                <span style={{ color: '#3B82F6' }}>◉</span>
                Ultra Plan – Eye of God Included:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {['Unlimited profile search', '24h GPS', 'Total anonymity', 'Complete history', 'Real-time notifications', 'WhatsApp Spy', 'Hidden gallery', 'Multiple targets'].map(item => (
                  <div key={item} className="flex items-center gap-2" style={{ color: 'rgba(180, 200, 230, 0.7)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#2563EB"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <a
              href={appendUtmToLink('https://go.centerpag.com/PPU38CQ8ACM')}
              className="block w-full py-3.5 rounded-xl text-center font-bold text-white mb-3"
              style={{
                background: 'linear-gradient(90deg, #1E40AF 0%, #2563EB 40%, #1D4ED8 60%, #3B82F6 85%, #60A5FA 100%)',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <span>▶</span>
                GET OFFER AND ACTIVATE
              </span>
            </a>

            <p className="text-xs text-center mb-3" style={{ color: 'rgba(180, 200, 230, 0.4)' }}>
              • This offer expires in: <span className="text-white font-semibold">{String(popupTimer.minutes).padStart(2, '0')}:{String(popupTimer.seconds).padStart(2, '0')}</span>
            </p>

            <button
              onClick={closePopup}
              className="text-xs text-center w-full underline transition-colors"
              style={{ color: 'rgba(180, 200, 230, 0.4)' }}
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1628' }}>
        <div style={{ color: 'rgba(180, 200, 230, 0.5)' }}>Loading...</div>
      </div>
    }>
      <Up1Content />
    </Suspense>
  );
}
