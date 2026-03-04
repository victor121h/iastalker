'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasSearched } from '@/lib/credits';
import { useTranslation } from '@/lib/useTranslation';
import SupportChat from '@/components/SupportChat';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  credits: number | null;
  status: 'available' | 'completed' | 'free' | 'locked';
}

function DashboardContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('User');
  const [credits, setCredits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [xp] = useState(5);
  const [maxXp] = useState(200);
  const [level] = useState(2);
  const [instagramSearched, setInstagramSearched] = useState(false);
  const [unlockedAll, setUnlockedAll] = useState(false);
  const [showFacebookPopup, setShowFacebookPopup] = useState(false); // kept for backward compat
  const [navigating, setNavigating] = useState(false);

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'src', 'sck', 'xcod', 'lang'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const appendUtmToPath = (basePath: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      return `${basePath}?${utmParams}`;
    }
    return basePath;
  };

  const navigateTo = (path: string) => {
    setNavigating(true);
    router.push(appendUtmToPath(path));
  };

  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    if (storedName) setUsername(storedName);

    setInstagramSearched(hasSearched());

    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) {
      fetch(`/api/credits?email=${encodeURIComponent(storedEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.available !== undefined) {
            setCredits(data.available);
          }
          if (data.credits !== undefined) {
            setTotalCredits(data.credits);
          }
          if (data.unlocked_all) {
            setUnlockedAll(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  const contractedServices = [
    { name: t('dash.camera'), subtitle: t('dash.target_device'), status: 'completed' },
    { name: t('dash.other_networks'), subtitle: t('dash.social_networks'), status: 'completed' }
  ];

  const availableServices: Service[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      description: t('dash.desc_instagram'),
      icon: '📷',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
      iconColor: 'text-white',
      credits: 25,
      status: totalCredits > 0 ? 'available' : 'locked'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: t('dash.desc_whatsapp'),
      icon: '💬',
      iconBg: 'bg-green-500',
      iconColor: 'text-white',
      credits: 40,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'investigator',
      name: t('dash.investigator_name'),
      description: t('dash.desc_investigator'),
      icon: '🕵️',
      iconBg: 'bg-amber-600',
      iconColor: 'text-white',
      credits: 45,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'location',
      name: 'Location',
      description: t('dash.desc_location'),
      icon: '📍',
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
      credits: 60,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'sms',
      name: 'SMS',
      description: t('dash.desc_sms'),
      icon: '💭',
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white',
      credits: 30,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'calls',
      name: 'Calls',
      description: t('dash.desc_calls'),
      icon: '📞',
      iconBg: 'bg-blue-400',
      iconColor: 'text-white',
      credits: 25,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'camera',
      name: 'Camera',
      description: t('dash.desc_camera'),
      icon: '📸',
      iconBg: 'bg-gray-700',
      iconColor: 'text-white',
      credits: null,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'other-networks',
      name: 'Other Networks',
      description: t('dash.desc_other'),
      icon: '🔗',
      iconBg: 'bg-red-600',
      iconColor: 'text-white',
      credits: null,
      status: unlockedAll ? 'available' : 'locked'
    }
  ];

  return (
    <>
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 py-3 px-4">
        <Link 
          href={appendUtmToPath('/Access')}
          className="flex items-center justify-center gap-2 text-white font-semibold text-sm md:text-base hover:opacity-90 transition-opacity text-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{t('dash.credits_banner')}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-end mb-4">
          <Link
            href={appendUtmToPath('/profile')}
            className="flex items-center gap-2 bg-[#12121a] border border-purple-500/30 rounded-xl px-4 py-2 text-purple-400 hover:text-purple-300 hover:border-purple-500/50 transition-all"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <span className="font-semibold text-sm">{t('dash.my_profile')}</span>
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900/50 to-purple-800/30 rounded-2xl p-6 mb-8 border border-purple-500/20"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                <span>✨</span>
                <span>{t('dash.welcome')}</span>
              </div>
              <h1 className="text-white text-2xl md:text-3xl font-bold">
                {t('dash.hello')} {username}! 👋
              </h1>
              <p className="text-gray-400 mt-1">{t('dash.choose_service')}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-purple-600/30 border border-purple-500/50 rounded-xl px-4 py-2 text-center">
                <span className="text-purple-300 text-xs">{t('dash.level')}</span>
                <p className="text-white font-bold text-lg">Nv.{level}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-[#12121a] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">⚡</span>
                  <span className="text-gray-400 text-sm">{t('dash.credits')}</span>
                </div>
              </div>
              <p className="text-white text-3xl font-bold mb-3">{credits}</p>
              <Link 
                href={appendUtmToPath('/buy')}
                className="block w-full py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold text-center transition-all"
              >
                {t('dash.buy_credits')}
              </Link>
            </div>

            <div className="bg-[#12121a] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-400">⭐</span>
                <span className="text-gray-400 text-sm">XP</span>
              </div>
              <p className="text-white text-xl font-bold mb-2">{xp}/{maxXp}</p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: `${(xp / maxXp) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-400">✓</span>
            <h2 className="text-white font-bold text-lg">{t('dash.contracted_services')}</h2>
          </div>

          <div className="space-y-3">
            {contractedServices.map((service, index) => (
              <div
                key={index}
                className="bg-[#12121a] rounded-xl p-4 border border-gray-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{service.name}</h3>
                    <p className="text-gray-500 text-sm">{service.subtitle}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  ✓ {t('dash.completed')}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-400">⚡</span>
            <h2 className="text-white font-bold text-lg">{t('dash.available_services')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                onClick={() => {
                  if (service.id === 'instagram') {
                    if (unlockedAll) {
                      navigateTo('/buscando');
                    } else if (credits >= 25) {
                      const storedEmail = localStorage.getItem('user_email') || '';
                      if (storedEmail) {
                        setNavigating(true);
                        fetch('/api/credits', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: storedEmail, amount: 25 }),
                        }).then(res => {
                          if (res.ok) {
                            setCredits(prev => prev - 25);
                            navigateTo('/buscando');
                          } else {
                            navigateTo('/buy');
                          }
                        }).catch(() => navigateTo('/buy'));
                      } else {
                        navigateTo('/buy');
                      }
                    } else {
                      navigateTo('/buy');
                    }
                  } else if (!unlockedAll) {
                    navigateTo('/buy');
                  } else if (service.id === 'location') {
                    navigateTo('/location');
                  } else if (service.id === 'other-networks') {
                    navigateTo('/outros');
                  } else if (service.id === 'calls') {
                    navigateTo('/calls');
                  } else if (service.id === 'whatsapp') {
                    navigateTo('/whatsapp');
                  } else if (service.id === 'investigator') {
                    navigateTo('/investigator');
                  } else if (service.id === 'sms') {
                    navigateTo('/sms');
                  } else if (service.id === 'camera') {
                    navigateTo('/camera');
                  }
                }}
                className={`bg-[#12121a] rounded-xl p-4 border ${
                  service.status === 'completed' 
                    ? 'border-green-500/30' 
                    : service.status === 'locked'
                    ? 'border-gray-700/50 opacity-80'
                    : 'border-gray-800 hover:border-purple-500/50'
                } transition-all cursor-pointer group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl ${service.iconBg} flex items-center justify-center text-2xl ${service.status === 'locked' ? 'opacity-60' : ''}`}>
                    {service.icon}
                  </div>
                  {service.status === 'completed' && (
                    <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </span>
                  )}
                  {service.status === 'available' && (
                    <span className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
                      </svg>
                    </span>
                  )}
                  {service.status === 'locked' && (
                    <span className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    </span>
                  )}
                </div>

                <h3 className="text-white font-bold mb-1">{service.name}</h3>
                <p className="text-gray-500 text-xs mb-4 line-clamp-2">{service.description}</p>

                {service.status === 'free' ? (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    {t('dash.free')} 🎁
                  </span>
                ) : service.status === 'completed' ? (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    ✓ {t('dash.completed')}
                  </span>
                ) : service.status === 'available' && service.id === 'investigator' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ⭐ {t('dash.exclusive_offer')}
                  </span>
                ) : service.status === 'available' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    🔓 {t('dash.available')}
                  </span>
                ) : service.status === 'locked' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                    {service.id === 'instagram' ? `🔒 ${t('dash.purchase_credits_unlock')}` : `🔒 ${t('dash.locked')}`}
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    ⚡ {service.credits} {t('dash.credits_suffix')}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8 mt-8"
        >
          <p className="text-gray-600 text-sm">
            {t('dash.all_rights')}
          </p>
        </motion.footer>
      </div>

      <AnimatePresence>
        {navigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-300 text-sm">Loading...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFacebookPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFacebookPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c2e] border border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="text-4xl mb-3">🔧</div>
              <h3 className="text-white font-bold text-lg mb-2">{t('dash.under_maintenance')}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {t('dash.maintenance_msg')}
              </p>
              <p className="text-gray-500 text-xs mb-4">
                {t('dash.try_camera')}
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(appendUtmToPath('/camera'))}
                className="w-full py-3 rounded-xl font-bold text-white mb-3"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                {t('dash.open_camera')}
              </motion.button>
              <button
                onClick={() => setShowFacebookPopup(false)}
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                {t('dash.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
</div>
      <SupportChat />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <DashboardContent />
    </Suspense>
  );
}
