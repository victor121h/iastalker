'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useMemo, memo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasSearched } from '@/lib/credits';
import { useTranslation } from '@/lib/useTranslation';


const DashboardVideoPlayer = memo(function DashboardVideoPlayer() {
  const sdkLoaded = useRef(false);
  const [videoSrc, setVideoSrc] = useState('');

  useEffect(() => {
    if (sdkLoaded.current) return;
    sdkLoaded.current = true;

    const existing = document.querySelector('script[src*="smartplayer-wc"]');
    if (!existing) {
      const sdkScript = document.createElement('script');
      sdkScript.src = 'https://scripts.converteai.net/lib/js/smartplayer-wc/v4/sdk.js';
      sdkScript.async = true;
      document.head.appendChild(sdkScript);
    }

    const search = window.location.search || '?';
    const vl = encodeURIComponent(window.location.href);
    setVideoSrc(`https://scripts.converteai.net/0bf1bdff-cfdb-4cfd-bf84-db4df0db7bb2/players/69ae20fba584f1a405ffce36/v4/embed.html${search}&vl=${vl}`);
  }, []);

  if (!videoSrc) return (
    <div id="ifr_69ae20fba584f1a405ffce36_wrapper_dash" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative', padding: '177.78% 0 0 0' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', borderRadius: '12px' }} />
      </div>
    </div>
  );

  return (
    <div id="ifr_69ae20fba584f1a405ffce36_wrapper_dash" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative', padding: '177.78% 0 0 0' }}>
        <iframe
          frameBorder="0"
          allowFullScreen
          src={videoSrc}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          referrerPolicy="origin"
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
});

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
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [canCloseVerify, setCanCloseVerify] = useState(false);
  const [verifyShownOnce, setVerifyShownOnce] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [cancelEmail, setCancelEmail] = useState('');
  const [searchedUsername, setSearchedUsername] = useState('');

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'src', 'sck', 'xcod', 'lang'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const appendUtmToLink = (baseUrl: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}${utmParams}`;
    }
    return baseUrl;
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

    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {} as Record<string, string>);
    const savedTarget = cookies['pitch_username'] || sessionStorage.getItem('pitch_username') || '';
    if (savedTarget) setSearchedUsername(savedTarget);

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

    const verifyTimer = setTimeout(() => {
      setShowVerifyPopup(true);
      setCanCloseVerify(false);
      setTimeout(() => setCanCloseVerify(true), 5000);
      setVerifyShownOnce(true);
    }, 30000);
    return () => clearTimeout(verifyTimer);
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
      credits: 120,
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
      status: 'available' as const
    },
    {
      id: 'suspicious-message',
      name: 'Suspicious Message',
      description: 'Suspicious conversation detected on the device.',
      icon: '⚠️',
      iconBg: 'bg-orange-500',
      iconColor: 'text-white',
      credits: null,
      status: 'available' as const
    },
    {
      id: 'location',
      name: 'Location',
      description: t('dash.desc_location'),
      icon: '📍',
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
      credits: 120,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'sms',
      name: 'SMS',
      description: t('dash.desc_sms'),
      icon: '💭',
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white',
      credits: 120,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'calls',
      name: 'Calls',
      description: t('dash.desc_calls'),
      icon: '📞',
      iconBg: 'bg-blue-400',
      iconColor: 'text-white',
      credits: 120,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'camera',
      name: 'Camera',
      description: t('dash.desc_camera'),
      icon: '📸',
      iconBg: 'bg-gray-700',
      iconColor: 'text-white',
      credits: 120,
      status: unlockedAll ? 'available' : 'locked'
    },
    {
      id: 'other-networks',
      name: 'Other Networks',
      description: t('dash.desc_other'),
      icon: '🔗',
      iconBg: 'bg-red-600',
      iconColor: 'text-white',
      credits: 120,
      status: unlockedAll ? 'available' : 'locked'
    }
  ];

  return (
    <>
    <div className="min-h-screen bg-[#0a0a0f]">
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800"
        >
          <DashboardVideoPlayer />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col gap-3 mb-8"
        >
          <Link
            href={appendUtmToPath('/up1')}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Activate your plan
          </Link>
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
                  } else if (service.id === 'investigator') {
                    navigateTo('/detetive');
                  } else if (service.id === 'suspicious-message') {
                    navigateTo('/chat4');
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

      <AnimatePresence>
        {showVerifyPopup && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-[100] max-w-[420px] mx-auto bg-white rounded-[24px] p-6 text-center"
            style={{ boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3)' }}
          >
            {canCloseVerify && (
              <button
                onClick={() => {
                  setShowVerifyPopup(false);
                  setTimeout(() => {
                    setShowVerifyPopup(true);
                    setCanCloseVerify(true);
                  }, 30000);
                }}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}

            <div className="flex justify-center mb-4">
              <div className="w-[50px] h-[50px] bg-[#4A90D9] rounded-xl flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
            </div>

            <h1 className="text-[#1a1a1a] text-xl font-bold leading-tight mb-4">
              FINAL STEP
            </h1>
            
            <p className="text-[#666666] text-sm mb-4 leading-relaxed">
              You need to verify your identity and prove you're not a robot. We were experiencing hacker attacks on our servers.
            </p>

            <p className="text-[#1a1a1a] text-base font-bold mb-3">
              Verification Fee: <span className="text-[#4A90D9]">$59.90</span>
            </p>

            <p className="text-[#4A90D9] text-xs mb-3 leading-relaxed font-semibold">
              But don't worry, this amount will be refunded once your account is confirmed in the system.
            </p>

            <p className="text-red-500 text-xs mb-4 leading-relaxed font-semibold bg-red-50 p-2 rounded-lg">
              If we don't identify your payment to verify your account, your access will be lost in the next two hours.
            </p>

            <a
              href={appendUtmToLink('https://go.centerpag.com/PPU38CQ8ACN')}
              className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full text-white font-bold text-sm transition-all duration-300 hover:opacity-90 hover:scale-[1.02] mb-3 bg-[#4A90D9]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              VERIFY MY ACCOUNT
            </a>

            <div className="flex items-center justify-center gap-2 text-[#888888] text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>100% Anonymous. The person will <span className="text-[#4A90D9] font-bold">NEVER</span> know.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowCancelPopup(true)}
        className="fixed bottom-6 right-6 z-[50] bg-[#E53935] hover:bg-[#c62828] text-white text-xs font-semibold px-4 py-3 rounded-full shadow-lg shadow-[#E53935]/30 transition-colors"
      >
        Want to cancel AI Ghost?
      </button>

      {showCancelPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4">
          <div className="bg-[#111111] rounded-2xl p-6 max-w-sm w-full border border-[#E53935]/40 relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-[#E53935] font-bold text-lg text-center mb-4">
              We will notify that you cloned @{searchedUsername || 'user'}&apos;s Instagram
            </h2>
            <p className="text-white/70 text-sm mb-4">
              Be aware that by canceling AI Ghost:
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-[#E53935] mt-0.5">•</span>
                <p className="text-white/70 text-sm">We will notify <span className="text-white font-semibold">@{searchedUsername || 'user'}</span> that you cloned their Instagram. This can be an extremely serious action, as it is illegal to invade someone else&apos;s Instagram.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E53935] mt-0.5">•</span>
                <p className="text-white/70 text-sm">Your data will be sent to <span className="text-white font-semibold">@{searchedUsername || 'user'}</span></p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E53935] mt-0.5">•</span>
                <p className="text-white/70 text-sm">They will have all the evidence against you</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E53935] mt-0.5">•</span>
                <p className="text-white/70 text-sm">Attempting to dispute the purchase outside the platform will also result in us revealing everything to <span className="text-white font-semibold">@{searchedUsername || 'user'}</span></p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setShowCancelPopup(false)}
                className="w-full bg-[#00FF75] text-black font-bold py-3 rounded-xl transition-colors hover:bg-[#00cc5e]"
              >
                I don&apos;t want to be exposed
              </button>
              <button
                onClick={() => { setShowCancelPopup(false); setShowEmailPopup(true); }}
                className="w-full bg-transparent border border-[#E53935]/40 text-[#E53935] font-medium py-3 rounded-xl text-sm hover:bg-[#E53935]/10 transition-colors"
              >
                I want to proceed to cancel and be exposed
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4">
          <div className="bg-[#111111] rounded-2xl p-6 max-w-sm w-full border border-[#2a2a2a] relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowEmailPopup(false)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <h2 className="text-white font-bold text-lg text-center mb-2">Cancel AI Ghost</h2>
            <p className="text-white/60 text-sm text-center mb-5">Enter your purchase email</p>
            <input
              type="email"
              value={cancelEmail}
              onChange={(e) => setCancelEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#0a0a0f] border border-[#333] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#E53935]/50 mb-4 placeholder:text-white/30"
            />
            <button
              onClick={() => {
                if (cancelEmail.trim()) {
                  setShowEmailPopup(false);
                  setShowRefundConfirm(true);
                  setCancelEmail('');
                }
              }}
              className="w-full bg-[#E53935] text-white font-bold py-3 rounded-xl transition-colors hover:bg-[#c62828]"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {showRefundConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4">
          <div className="bg-[#111111] rounded-2xl p-6 max-w-sm w-full border border-[#2a2a2a] text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#00FF75]/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            </div>
            <h2 className="text-white font-bold text-lg mb-3">Refund Approved</h2>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Your refund has been approved and is expected to arrive within <span className="text-white font-semibold">5 to 12 business days</span>. If you wish to cancel the refund and continue using the service, please contact our support.
            </p>
            <button
              onClick={() => setShowRefundConfirm(false)}
              className="w-full bg-white/10 text-white font-medium py-3 rounded-xl transition-colors hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      )}

</div>
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
