'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BuyContent() {
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

  const plans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      subtitle: 'Basic plan for quick tests',
      credits: '25',
      price: '$49.90',
      features: [
        'Credits never expire',
        'Access to all services'
      ],
      warning: 'May not be enough for frequent use',
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-500/10',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      link: 'https://go.centerpag.com/PPU38CQ7374'
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      subtitle: '+125 more credits than Basic for only $30 more',
      credits: '150',
      price: '$79.90',
      features: [
        'Credits never expire',
        'Access to all services',
        'Cost per credit up to 6x lower than Basic',
        '+100 bonus credits',
        'Save $129.40'
      ],
      bottomText: 'The ideal choice for those who will use it more than once',
      color: 'from-purple-500 to-pink-500',
      borderColor: 'border-purple-500/50',
      bgColor: 'bg-purple-500/10',
      buttonColor: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
      popular: true,
      link: 'https://go.centerpag.com/PPU38CQ735R'
    },
    {
      id: 'mega',
      name: 'Mega Plan',
      subtitle: '850 more credits than Pro for a small upgrade',
      credits: '1,000',
      price: '$147.00',
      features: [
        'Unlimited access to all tools',
        'One of the lowest cost per credit on the platform'
      ],
      bottomText: 'Recommended for frequent and continuous use',
      warning: 'Intensive users may exceed this limit',
      color: 'from-amber-500 to-orange-500',
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/10',
      buttonColor: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
      link: 'https://go.centerpag.com/PPU38CQ735S'
    },
    {
      id: 'unlimited',
      name: 'Unlimited Plan',
      subtitle: 'Use without limits. No counting. No worries.',
      credits: 'Unlimited',
      price: '$197.00',
      features: [
        'Unlimited access to all tools',
        'Cell phone tracker',
        'Access to person\'s camera',
        'Cheaper than recharging credits multiple times'
      ],
      bottomText: 'Never worry about credits again\nFree usage, no blocks',
      finalText: 'If you plan to use it frequently, this plan pays for itself',
      color: 'from-emerald-500 to-teal-500',
      borderColor: 'border-emerald-500/50',
      bgColor: 'bg-emerald-500/10',
      buttonColor: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
      best: true,
      link: 'https://go.centerpag.com/PPU38CQ7360'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 px-4">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15) 0%, transparent 50%)'
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-white text-3xl md:text-4xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-gray-400 text-lg">
            Select the best plan for your investigation needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-[#12121a] rounded-2xl border ${plan.borderColor} p-6 flex flex-col ${
                plan.popular ? 'ring-2 ring-purple-500' : ''
              } ${plan.best ? 'ring-2 ring-emerald-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}
              {plan.best && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    BEST VALUE
                  </span>
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                <span className="text-white text-2xl">⚡</span>
              </div>

              <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
              {plan.subtitle && (
                <p className="text-gray-500 text-xs mb-3">{plan.subtitle}</p>
              )}
              
              <div className="mb-4">
                <span className="text-gray-400 text-sm">Credits</span>
                <p className={`text-2xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                  {plan.credits}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-white text-3xl font-bold">{plan.price}</p>
                <span className="text-gray-500 text-sm">one-time payment</span>
              </div>

              <div className="space-y-3 mb-4 flex-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {plan.warning && (
                <p className="text-yellow-500/70 text-xs mb-3 italic">⚠ {plan.warning}</p>
              )}

              {plan.bottomText && (
                <div className="mb-4">
                  {plan.bottomText.split('\n').map((line, idx) => (
                    <p key={idx} className="text-gray-400 text-xs">{line}</p>
                  ))}
                </div>
              )}

              {plan.finalText && (
                <p className="text-emerald-400 text-xs font-semibold mb-4">{plan.finalText}</p>
              )}

              <a
                href={appendUtmToLink(plan.link)}
                className={`block w-full py-4 rounded-xl text-center font-bold text-white ${plan.buttonColor} transition-all duration-300`}
              >
                Get Started
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <div className="flex flex-wrap justify-center gap-6 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Instant Access</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>24/7 Support</span>
            </div>
          </div>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-8 mt-8"
        >
          <p className="text-gray-600 text-sm">
            © 2024 IA Observer - All rights reserved
          </p>
        </motion.footer>
      </div>
    </div>
  );
}

export default function BuyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <BuyContent />
    </Suspense>
  );
}
