'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/useTranslation';
import { getCheckoutUrl } from '@/lib/checkoutLinks';

interface ChatMessage {
  id: number;
  text: string;
  time: string;
  isMe: boolean;
  delay: number;
}

function DetetiveContent() {
  const searchParams = useSearchParams();
  const { t, lang } = useTranslation();
  const [showDemo, setShowDemo] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [showFinalBanner, setShowFinalBanner] = useState(false);

  const chatMessages: ChatMessage[] = [
    { id: 1, text: t('det.chat_1'), time: '23:42', isMe: true, delay: 500 },
    { id: 2, text: t('det.chat_2'), time: '23:42', isMe: true, delay: 1200 },
    { id: 3, text: t('det.chat_3'), time: '23:44', isMe: false, delay: 2500 },
    { id: 4, text: t('det.chat_4'), time: '23:44', isMe: false, delay: 3800 },
    { id: 5, text: t('det.chat_5'), time: '23:45', isMe: true, delay: 5200 },
    { id: 6, text: t('det.chat_6'), time: '23:46', isMe: false, delay: 6800 },
    { id: 7, text: t('det.chat_7'), time: '23:46', isMe: false, delay: 8200 },
    { id: 8, text: t('det.chat_8'), time: '23:47', isMe: true, delay: 10000 },
    { id: 9, text: t('det.chat_9'), time: '23:47', isMe: true, delay: 12000 },
    { id: 10, text: t('det.chat_10'), time: '23:48', isMe: true, delay: 14000 },
    { id: 11, text: t('det.chat_11'), time: '23:48', isMe: true, delay: 16000 },
  ];

  useEffect(() => {
    if (showDemo) {
      setVisibleMessages([]);
      setShowFinalBanner(false);
      
      chatMessages.forEach((msg) => {
        setTimeout(() => {
          setVisibleMessages(prev => [...prev, msg.id]);
        }, msg.delay);
      });

      setTimeout(() => {
        setShowFinalBanner(true);
      }, 17500);
    } else {
      setVisibleMessages([]);
      setShowFinalBanner(false);
    }
  }, [showDemo]);

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'src', 'sck', 'xcod', 'lang'];
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

  const steps = [
    {
      number: 1,
      title: t('det.step1_title'),
      description: t('det.step1_desc')
    },
    {
      number: 2,
      title: t('det.step2_title'),
      description: t('det.step2_desc')
    },
    {
      number: 3,
      title: t('det.step3_title'),
      description: t('det.step3_desc')
    },
    {
      number: 4,
      title: t('det.step4_title'),
      description: t('det.step4_desc')
    },
    {
      number: 5,
      title: t('det.step5_title'),
      description: t('det.step5_desc')
    },
    {
      number: 6,
      title: t('det.step6_title'),
      description: t('det.step6_desc')
    },
    {
      number: 7,
      title: t('det.step7_title'),
      description: t('det.step7_desc')
    }
  ];

  const features = [
    { icon: '\ud83d\udc64', title: t('det.feat_detective'), subtitle: t('det.feat_detective_sub') },
    { icon: '\ud83d\udcac', title: t('det.feat_whatsapp'), subtitle: t('det.feat_whatsapp_sub') },
    { icon: '\ud83d\udcc4', title: t('det.feat_pdf'), subtitle: t('det.feat_pdf_sub') },
    { icon: '\ud83d\udc41\ufe0f', title: t('det.feat_live'), subtitle: t('det.feat_live_sub') },
    { icon: '\ud83d\udcf8', title: t('det.feat_screenshots'), subtitle: t('det.feat_screenshots_sub') },
    { icon: '\u2713', title: t('det.feat_analysis'), subtitle: t('det.feat_analysis_sub') }
  ];

  const masterProFeatures = [
    t('det.master_feat_1'),
    t('det.master_feat_2'),
    t('det.master_feat_3'),
    t('det.master_feat_4'),
    t('det.master_feat_5'),
    t('det.master_feat_6'),
    t('det.master_feat_7')
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-[#1a1a2e] rounded-2xl flex items-center justify-center border border-gray-700">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h1 className="text-white text-2xl font-bold mb-2">
            {t('det.title')}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {t('det.subtitle')}
          </p>

          <div className="flex justify-center gap-3 mb-6">
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {t('det.real_investigation')}
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-gray-700/50 text-gray-300 border border-gray-600">
              {t('det.confidential')}
            </span>
          </div>

          <div className="bg-[#1a1a2e] rounded-xl py-3 px-6 inline-flex items-center gap-2 border border-gray-700">
            <span className="text-purple-400">{'\ud83d\udc8e'}</span>
            <span className="text-white font-medium text-sm">{t('det.most_complete')}</span>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl">{'\u26a1'}</span>
            <h2 className="text-white font-bold text-lg">{t('det.how_works')}</h2>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm border border-gray-700">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl py-3 px-4 flex items-center justify-center gap-2">
            <span className="text-lg">{'\ud83d\udcf1'}</span>
            <span className="text-emerald-400 text-sm font-medium">{t('det.follow_whatsapp')}</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl">{'\ud83d\udd0d'}</span>
            <h2 className="text-white font-bold text-lg">{t('det.see_practice')}</h2>
          </div>
          <p className="text-gray-400 text-sm text-center mb-6">{t('det.real_example')}</p>

          <div className="relative mx-auto" style={{ maxWidth: '280px' }}>
            <div className="bg-[#1a1a2e] rounded-[32px] p-3 border-4 border-gray-700">
              <div className="bg-[#e5ddd5] rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16' }}>
                <div className="bg-[#075e54] py-2 px-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-xs">{'\ud83d\udd0d'}</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">{t('det.investigation_tip')}</p>
                    <p className="text-white/70 text-[10px]">online</p>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col items-center justify-center" style={{ minHeight: '200px' }}>
                  <button
                    onClick={() => setShowDemo(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
                  >
                    <span>{'\ud83d\udcf1'}</span>
                    {t('det.click_demo')}
                  </button>
                  <p className="text-gray-600 text-xs mt-3 text-center">{t('det.see_detective')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-xl py-3 px-4 text-center">
            <span className="text-purple-400 text-sm">
              {t('det.pro_technique')}
            </span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-white font-bold text-xl text-center mb-2">{t('det.whats_included')}</h2>
          <p className="text-gray-400 text-sm text-center mb-6">{t('det.discover_truth')}</p>

          <div className="grid grid-cols-3 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="bg-[#12121a] rounded-xl p-4 text-center border border-gray-800"
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <h3 className="text-white font-semibold text-xs mb-1">{feature.title}</h3>
                <p className="text-gray-500 text-[10px]">{feature.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{'\u26a1'}</span>
              <h2 className="text-white font-bold text-lg">{t('det.how_does_work')}</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
              {t('det.immediate_start')}
            </span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-400">{'\u2705'}</span>
              <span className="text-emerald-400 font-bold text-sm">{t('det.starts_now')}</span>
            </div>
            <p className="text-gray-400 text-xs">
              {t('det.starts_now_desc')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="text-white font-semibold text-sm">{t('det.how_step1_title')}</h3>
                <p className="text-gray-500 text-xs">{t('det.how_step1_desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="text-white font-semibold text-sm">{t('det.how_step2_title')}</h3>
                <p className="text-gray-500 text-xs">{t('det.how_step2_desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="text-white font-semibold text-sm">{t('det.how_step3_title')}</h3>
                <p className="text-gray-500 text-xs">{t('det.how_step3_desc')}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-red-400 text-xs">{t('det.investigation_lasts')}</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-6 mb-6 border-2 border-amber-500/50"
          style={{ background: 'linear-gradient(180deg, rgba(180, 130, 50, 0.1) 0%, rgba(10, 10, 15, 1) 100%)' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">{t('det.master_pro')}</h3>
              <p className="text-gray-400 text-sm">{t('det.real_encounter')}</p>
            </div>
            <div className="text-right">
              <span className="text-amber-400 text-xs font-bold bg-amber-500/20 px-2 py-1 rounded">VIP</span>
              <p className="text-amber-400 text-3xl font-bold mt-1"><span className="text-xl">$</span>147</p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl py-2 px-4 text-center mb-4 border border-gray-700">
            <span className="text-amber-400 text-sm">{t('det.everything_advanced')}</span>
          </div>

          <div className="space-y-3 mb-6">
            {masterProFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-amber-400 text-sm">{'\u2713'}</span>
                <span className="text-white text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl py-3 px-4 text-center mb-4">
            <p className="text-amber-400 text-sm font-medium">{'\ud83c\udfc6'} {t('det.most_complete_inv')}</p>
            <p className="text-amber-400 text-xs">{t('det.absolute_certainty')}</p>
          </div>

          <a
            href={appendUtmToLink(getCheckoutUrl('https://go.centerpag.com/PPU38CQ89H7', lang))}
            className="block w-full py-4 rounded-xl text-center font-bold text-black bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition-all"
          >
            {t('det.hire_master')}
          </a>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center py-8"
        >
          <p className="text-gray-500 text-xs">
            {t('det.copyright')}
          </p>
        </motion.section>
      </div>

      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" 
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#1a1a2e] rounded-[40px] p-3 border-4 border-gray-700 shadow-2xl">
                <div className="bg-[#e5ddd5] rounded-[28px] overflow-hidden" style={{ maxHeight: '70vh' }}>
                  <div className="bg-[#075e54] py-3 px-4 flex items-center gap-3">
                    <button onClick={() => setShowDemo(false)} className="text-white">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                      </svg>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#888">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{t('det.investigation_target')}</p>
                      <p className="text-white/70 text-xs">online</p>
                    </div>
                  </div>
                  
                  <div 
                    className="p-3 space-y-2 overflow-y-auto"
                    style={{ 
                      minHeight: '400px',
                      maxHeight: '50vh',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c4b998\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                      backgroundColor: '#e5ddd5'
                    }}
                  >
                    {chatMessages.map((msg) => (
                      <AnimatePresence key={msg.id}>
                        {visibleMessages.includes(msg.id) && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                            className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${
                                msg.isMe 
                                  ? 'bg-[#dcf8c6] rounded-tr-none' 
                                  : 'bg-white rounded-tl-none'
                              }`}
                            >
                              <p className="text-gray-800 text-sm">{msg.text}</p>
                              <p className="text-gray-500 text-[10px] text-right mt-1">{msg.time}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>

                  <AnimatePresence>
                    {showFinalBanner && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-red-500 to-red-600 py-3 px-4"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-white text-lg">{'\u26a0\ufe0f'}</span>
                          <div className="text-center">
                            <p className="text-white font-bold text-sm">{t('det.infidelity_confirmed')}</p>
                            <p className="text-white/90 text-xs">{t('det.evidence_sent')}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 18 }}
                onClick={() => setShowDemo(false)}
                className="w-full mt-4 py-3 rounded-xl bg-emerald-500 text-white font-bold"
              >
                {t('det.close_demo')}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function InvestigatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <DetetiveContent />
    </Suspense>
  );
}
