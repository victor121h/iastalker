'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Stage = 'input' | 'results';

interface ConversationEntry {
  number: string;
  updatedAt: string;
  unread: number;
  preview: string;
  credits: number;
}

function WhatsAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentCredits, setCurrentCredits] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showNoCreditsPopup, setShowNoCreditsPopup] = useState(false);

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
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

  const handleStartScan = () => {
    if (phoneNumber.trim().length >= 4) {
      setStage('results');
    }
  };

  const maskedPhone = phoneNumber
    ? `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`
    : '(--) -----‑----';

  const handleViewConversation = async () => {
    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: 65 }),
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

  const handleLoadMore = async () => {
    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: 35 }),
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

  const conversations: ConversationEntry[] = [
    {
      number: '(87) 9127-53**',
      updatedAt: 'Updated Today at 17:00',
      unread: 8,
      preview: 'going to sleep, gotta wake up early',
      credits: 65,
    },
    {
      number: '(87) 9654-78**',
      updatedAt: 'Updated Today at 14:22',
      unread: 0,
      preview: 'ok fine',
      credits: 65,
    },
    {
      number: '(87) 9392-94**',
      updatedAt: 'Updated Today at 17:24',
      unread: 12,
      preview: 'you can trust me 🔒',
      credits: 65,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <div className="w-full max-w-md mx-auto space-y-4">
        <AnimatePresence mode="wait">
          {stage === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[80vh] flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-[#0d0d14] border border-gray-800 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">WhatsApp Scanner</h1>
                    <p className="text-gray-400 text-sm">Enter the target phone number</p>
                  </div>
                </div>

                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4 mb-4">
                  <p className="text-gray-400 text-xs mb-1">Phone number to scan</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-lg">📱</span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 8778789-8977"
                      className="w-full bg-transparent text-white text-lg font-mono outline-none placeholder:text-gray-600"
                      maxLength={15}
                    />
                  </div>
                </div>

                <p className="text-gray-500 text-xs mb-4">
                  We will scan conversations, audio, calls and suspicious groups linked to this number.
                </p>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartScan}
                  disabled={phoneNumber.trim().length < 4}
                  className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    🔍 Start Scan
                  </span>
                </motion.button>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(appendUtmToPath('/dashboard'))}
                className="w-full py-3 rounded-xl font-semibold text-gray-400 bg-[#0d0d14] border border-gray-800 text-sm mt-4"
              >
                ← Back to Dashboard
              </motion.button>
            </motion.div>
          )}

          {stage === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-b from-green-900/30 to-[#0d0d14] border border-green-500/30 rounded-2xl p-5"
              >
                <p className="text-green-400 text-xs font-bold tracking-wider mb-2">WHATSAPP COMPLETED</p>
                <h2 className="text-white text-xl font-bold mb-1">
                  Scan finished with classified evidence
                </h2>
                <p className="text-gray-400 text-sm mb-1">{maskedPhone}</p>
                <p className="text-gray-500 text-xs mb-4">
                  We identified conversations, audio, and suspicious calls. Every detail was analyzed to reveal what truly matters.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#0d1a0d] border border-green-500/30 rounded-xl p-3 text-center">
                    <p className="text-green-400 text-[10px] font-bold uppercase">Suspicious Messages</p>
                    <p className="text-white font-bold text-lg">3 chats</p>
                  </div>
                  <div className="bg-[#1a0d1a] border border-purple-500/30 rounded-xl p-3 text-center">
                    <p className="text-purple-400 text-[10px] font-bold uppercase">Off-Hours Calls</p>
                    <p className="text-white font-bold text-lg">7 records</p>
                  </div>
                  <div className="bg-[#0d0d14] border border-gray-700 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Intercepted Audio</p>
                    <p className="text-white font-bold text-lg">18 files</p>
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
                  📱 Suspicious conversations monitored
                </h3>

                <div className="space-y-3">
                  {conversations.map((conv, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                      className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{conv.number}</span>
                          {conv.unread > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 text-xs font-semibold">{conv.credits} credits</span>
                          <span className="text-gray-500">›</span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs mb-2">{conv.updatedAt}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-400 text-sm italic">{conv.preview}</p>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleViewConversation}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2"
                        >
                          View chat
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLoadMore}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-[#0d0d14] border border-gray-600"
              >
                Load more conversations for 35 credits
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(appendUtmToPath('/dashboard'))}
                className="w-full py-3 rounded-xl font-semibold text-gray-400 bg-[#0d0d14] border border-gray-800 text-sm"
              >
                ← Back to Dashboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
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
              <h3 className="text-white font-bold text-lg mb-2">Insufficient Credits</h3>
              <p className="text-gray-400 text-sm mb-2">
                You don&apos;t have enough credits for this action.
              </p>
              <p className="text-yellow-400 text-sm mb-4">
                Your balance: {currentCredits} credits
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(appendUtmToPath('/buy'))}
                className="w-full py-3 rounded-xl font-bold text-white mb-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                Buy Credits
              </motion.button>
              <button
                onClick={() => setShowNoCreditsPopup(false)}
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WhatsAppContent />
    </Suspense>
  );
}
