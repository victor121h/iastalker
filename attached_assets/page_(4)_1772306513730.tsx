'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/useTranslation';

type MsgStatus = 'idle' | 'loading' | 'error';

interface SmsEntry {
  number: string;
  date: string;
  direction: 'sent' | 'received';
  preview: string;
  tags: string[];
}

function SmsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [currentCredits, setCurrentCredits] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showNoCreditsPopup, setShowNoCreditsPopup] = useState(false);
  const [msgStatuses, setMsgStatuses] = useState<MsgStatus[]>([]);
  const [loadingStep, setLoadingStep] = useState<number[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<number[]>([]);

  const loadingSteps = [
    t('sms.collecting'),
    t('sms.carrier'),
    t('sms.identifying'),
    t('sms.decrypting'),
    t('sms.loading'),
  ];

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
    return utmParams ? `${basePath}?${utmParams}` : basePath;
  };

  useEffect(() => {
    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) {
      setUserEmail(storedEmail);
      fetch(`/api/credits?email=${encodeURIComponent(storedEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.available !== undefined) setCurrentCredits(data.available);
        })
        .catch(() => {});
    }
  }, []);

  const messages: SmsEntry[] = [
    {
      number: '(87) 9127-53**',
      date: 'Today at 16:42',
      direction: 'received',
      preview: 'Hey love, are you coming today? I miss you so much...',
      tags: ['Suspicious'],
    },
    {
      number: '(87) 9654-78**',
      date: 'Today at 14:10',
      direction: 'sent',
      preview: 'I\'ll be there in 20 min, wait for me at the usual place',
      tags: ['Suspicious'],
    },
    {
      number: '0800 722 0800',
      date: 'Today at 12:30',
      direction: 'received',
      preview: 'Your bank statement is available. Access: ...',
      tags: ['Service'],
    },
    {
      number: '(87) 9392-94**',
      date: 'Yesterday at 23:15',
      direction: 'received',
      preview: 'Delete this conversation ok? Nobody can know 🔒',
      tags: ['Suspicious', 'Night'],
    },
    {
      number: '(87) 9845-12**',
      date: 'Yesterday at 21:30',
      direction: 'sent',
      preview: 'Tomorrow same time and place?',
      tags: ['Suspicious'],
    },
    {
      number: '29192',
      date: 'Yesterday at 18:00',
      direction: 'received',
      preview: 'Your verification code is: 4829. Do not share it.',
      tags: ['Service'],
    },
  ];

  useEffect(() => {
    if (msgStatuses.length === 0) {
      setMsgStatuses(messages.map(() => 'idle'));
      setLoadingStep(messages.map(() => 0));
      setLoadingProgress(messages.map(() => 0));
    }
  }, [msgStatuses.length, messages.length]);

  const runLoadingSequence = (index: number, onComplete: () => void) => {
    setLoadingProgress(prev => { const n = [...prev]; n[index] = 0; return n; });
    setLoadingStep(prev => { const n = [...prev]; n[index] = 0; return n; });

    let currentStep = 0;
    const totalSteps = loadingSteps.length;

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        clearInterval(stepInterval);
        setLoadingStep(prev => { const n = [...prev]; n[index] = totalSteps - 1; return n; });
        setLoadingProgress(prev => { const n = [...prev]; n[index] = 100; return n; });
        setTimeout(onComplete, 600);
        return;
      }
      setLoadingStep(prev => { const n = [...prev]; n[index] = currentStep; return n; });
      setLoadingProgress(prev => { const n = [...prev]; n[index] = Math.round((currentStep / (totalSteps - 1)) * 100); return n; });
    }, 1200);
  };

  const handleViewFull = async (index: number) => {
    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentCredits(data.available);
        setMsgStatuses(prev => { const n = [...prev]; n[index] = 'loading'; return n; });
        runLoadingSequence(index, () => {
          setMsgStatuses(prev => { const n = [...prev]; n[index] = 'error'; return n; });
        });
      } else {
        setShowNoCreditsPopup(true);
      }
    } catch {
      setShowNoCreditsPopup(true);
    }
  };

  const handleLoadMore = async () => {
    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentCredits(data.available);
      } else {
        setShowNoCreditsPopup(true);
      }
    } catch {
      setShowNoCreditsPopup(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <div className="w-full max-w-md mx-auto space-y-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-2"
        >
          <button
            onClick={() => router.push(appendUtmToPath('/dashboard'))}
            className="text-gray-400 text-sm hover:text-white transition-colors"
          >
            {t('common.back')}
          </button>
          <h1 className="text-white font-bold text-lg">{t('sms.title')}</h1>
          <div className="w-12" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-yellow-900/30 to-[#0d0d14] border border-yellow-500/30 rounded-2xl p-5"
        >
          <p className="text-yellow-400 text-xs font-bold tracking-wider mb-2">{t('sms.scan_completed')}</p>
          <h2 className="text-white text-xl font-bold mb-1">{t('sms.classified')}</h2>
          <p className="text-gray-400 text-sm mb-4">
            {t('sms.scan_desc')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0d1a0d] border border-yellow-500/30 rounded-xl p-3 text-center">
              <p className="text-yellow-400 text-[10px] font-bold uppercase">{t('sms.suspicious')}</p>
              <p className="text-white font-bold text-lg">4</p>
            </div>
            <div className="bg-[#1a0d1a] border border-purple-500/30 rounded-xl p-3 text-center">
              <p className="text-purple-400 text-[10px] font-bold uppercase">{t('sms.night_msgs')}</p>
              <p className="text-white font-bold text-lg">2</p>
            </div>
            <div className="bg-[#0d0d14] border border-gray-700 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-[10px] font-bold uppercase">{t('sms.total')}</p>
              <p className="text-white font-bold text-lg">6</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4"
        >
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            {t('sms.intercepted_title')}
          </h3>

          <div className="space-y-3">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-sm">{msg.number}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      msg.direction === 'sent'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {msg.direction === 'sent' ? t('sms.sent') : t('sms.received')}
                    </span>
                    {msg.tags.map((tag, i) => (
                      <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        tag === 'Suspicious'
                          ? 'bg-red-500/20 text-red-400'
                          : tag === 'Night'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-gray-600/30 text-gray-400'
                      }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-500 text-xs mb-2">{msg.date}</p>

                <AnimatePresence mode="wait">
                  {(!msgStatuses[index] || msgStatuses[index] === 'idle') && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between"
                    >
                      <p className="text-gray-400 text-sm italic flex-1">&quot;{msg.preview}&quot;</p>
                      {msg.tags.includes('Suspicious') && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleViewFull(index)}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2"
                        >
                          {t('sms.view_full')}
                        </motion.button>
                      )}
                    </motion.div>
                  )}

                  {msgStatuses[index] === 'loading' && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-yellow-400 text-sm font-semibold">
                          {loadingSteps[loadingStep[index]] || t('common.processing')}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${loadingProgress[index]}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1 text-right">{loadingProgress[index]}%</p>
                    </motion.div>
                  )}

                  {msgStatuses[index] === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-2 space-y-3"
                    >
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          <span className="text-red-400 font-bold text-xs">{t('sms.access_blocked')}</span>
                        </div>
                        <p className="text-red-300 text-xs">
                          {t('sms.blocked_desc')}
                        </p>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                        <p className="text-yellow-300 text-xs">
                          {t('sms.proxy_required')}
                        </p>
                      </div>

                      <a
                        href="https://go.centerpag.com/PPU38CQ7BQI"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 rounded-xl font-bold text-white text-center text-sm bg-gradient-to-r from-yellow-600 to-orange-600 hover:opacity-90 transition-opacity"
                      >
                        {t('sms.unlock_proxy')}
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLoadMore}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-[#0d0d14] border border-gray-600"
        >
          {t('sms.load_more')}
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push(appendUtmToPath('/dashboard'))}
          className="w-full py-3 rounded-xl font-semibold text-gray-400 bg-[#0d0d14] border border-gray-800 text-sm"
        >
          {t('common.back_dashboard')}
        </motion.button>
      </div>

      <AnimatePresence>
        {showNoCreditsPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNoCreditsPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c2e] border border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="text-4xl mb-3">💳</div>
              <h3 className="text-white font-bold text-lg mb-2">{t('common.insufficient_credits')}</h3>
              <p className="text-gray-400 text-sm mb-2">
                {t('common.not_enough_credits')}
              </p>
              <p className="text-yellow-400 text-sm mb-4">
                {t('common.your_balance')} {currentCredits} credits
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(appendUtmToPath('/buy'))}
                className="w-full py-3 rounded-xl font-bold text-white mb-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                {t('common.buy_credits')}
              </motion.button>
              <button
                onClick={() => setShowNoCreditsPopup(false)}
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                {t('common.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SmsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SmsContent />
    </Suspense>
  );
}
