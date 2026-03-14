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

  const plan = {
    id: 'ultra',
    name: 'Ultra Plan – Eye of God',
    badge: 'DISCOUNT: 90% off',
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
      { text: 'Lifetime access to AI Ghost', included: true },
      { text: 'Unlimited profile searches', included: true },
      { text: '24h priority support', included: true },
    ],
    link: 'https://go.centerpag.com/PPU38CQ8U5G',
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082b 30%, #1c0c30 50%, #200e35 70%, #1a0a2e 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(138, 43, 226, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 140, 0, 0.08) 0%, transparent 50%)'
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 rounded-full bg-purple-400/30 animate-pulse" />
        <div className="absolute top-[30%] right-[10%] w-1.5 h-1.5 rounded-full bg-orange-400/25 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[25%] left-[15%] w-1 h-1 rounded-full bg-pink-400/20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-yellow-400/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[15%] right-[30%] w-1 h-1 rounded-full bg-purple-300/25 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 py-2.5 px-4" style={{ background: 'linear-gradient(90deg, #8B2FC9 0%, #C13584 40%, #E1306C 60%, #F77737 85%, #FCAF45 100%)' }}>
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
              background: 'linear-gradient(145deg, rgba(30, 15, 50, 0.9) 0%, rgba(20, 10, 35, 0.95) 100%)',
              border: '1px solid rgba(138, 43, 226, 0.25)',
              boxShadow: '0 0 60px rgba(138, 43, 226, 0.12), 0 25px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 30px rgba(138, 43, 226, 0.3)' }}>
                <img src="/ghost-logo.png" alt="AI Ghost Logo" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-white text-xl font-bold mb-1">Mobile Installation Fee</h1>
              <div className="w-12 h-0.5 mx-auto mt-2" style={{ background: 'linear-gradient(90deg, #C13584, #F77737)' }} />
            </div>

            <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(200, 180, 220, 0.6)' }}>
                You purchased AI Ghost for <span className="text-white font-semibold">desktop</span> and we detected that you are accessing via <span className="text-white font-semibold">mobile</span>.
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'rgba(200, 180, 220, 0.6)' }}>
                It is <span className="text-white font-semibold">mandatory</span> that you choose one of the plans below to activate your account on mobile. If you do not complete the activation, <span className="text-white font-semibold">you will not be able to access AI Ghost</span>.
              </p>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">👆</span>
                <div>
                  <p className="text-sm" style={{ color: 'rgba(200, 180, 220, 0.6)' }}>
                    <span className="text-white font-semibold">Current plan:</span> Eye of God – $29.90
                  </p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#F59E0B' }}>
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
              <span className="text-white">SELECT </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #C13584, #F77737)' }}
              >your plan below:</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-[22px] p-5 border-2 border-[#00FF75] relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(30, 15, 50, 0.9) 0%, rgba(20, 10, 35, 0.95) 100%)',
              boxShadow: '0 0 40px rgba(0, 255, 117, 0.1), 0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              {plan.badge}
            </div>

            <h3 className="text-white font-bold text-lg mb-2 pr-24">{plan.name}</h3>

            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">📱</span>
              <span className="font-extrabold text-xl uppercase tracking-wide" style={{ color: '#00FF75' }}>Mobile Plan</span>
            </div>

            <div className="space-y-2.5 mb-5">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">{feature.text}</p>
                </div>
              ))}
            </div>

            <div className="text-center mb-4">
              <p className="text-[#666] text-sm line-through mb-1">From: ${plan.oldPrice}</p>
              <p className="text-white text-3xl font-bold">
                ${plan.price.split('.')[0]}<span className="text-xl">.{plan.price.split('.')[1]}</span>
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: '#C13584' }}>You save ${plan.savings}</p>
            </div>

            <a
              href={appendUtmToLink(plan.link)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 rounded-xl text-center font-bold text-white"
              style={{
                background: 'linear-gradient(90deg, #8B2FC9 0%, #C13584 40%, #E1306C 60%, #F77737 85%, #FCAF45 100%)',
                boxShadow: '0 4px 20px rgba(193, 53, 132, 0.4)',
              }}
            >
              SELECT PLAN
            </a>

            <div className="mt-4 rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(0, 255, 117, 0.07)', border: '1px solid rgba(0, 255, 117, 0.25)' }}>
              <p className="text-white text-sm font-semibold leading-relaxed">
                💰 The <span style={{ color: '#00FF75' }}>$29.90</span> from your desktop plan will be refunded after you purchase the mobile plan.
              </p>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
                In other words, you will only pay <span className="text-white font-bold">$49.90</span> in total — since the $29.90 you already paid comes back to you.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm mb-4" style={{ color: 'rgba(200, 180, 220, 0.4)' }}>100% Secure Purchase - SSL Encryption</p>
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(30, 15, 50, 0.8)', border: '1px solid rgba(138, 43, 226, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <span className="text-white text-xs">30-day guarantee</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(30, 15, 50, 0.8)', border: '1px solid rgba(138, 43, 226, 0.2)' }}>
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a2e' }}>
        <div style={{ color: 'rgba(200, 180, 220, 0.5)' }}>Loading...</div>
      </div>
    }>
      <Up6Content />
    </Suspense>
  );
}
