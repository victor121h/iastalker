'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CallEntry {
  number: string;
  type: 'outgoing' | 'incoming';
  tags: string[];
  date: string;
  hasTranscription: boolean;
  transcriptionPreview?: string;
  fullTranscription?: string[];
}

function CallsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const handleTranscribe = async () => {
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
      } else {
        setShowNoCreditsPopup(true);
      }
    } catch {
      setShowNoCreditsPopup(true);
    }
  };

  const calls: CallEntry[] = [
    {
      number: '(55) 87 99995-****',
      type: 'outgoing',
      tags: ['Same Area Code'],
      date: '07/02/2026 • 17:28',
      hasTranscription: false,
    },
    {
      number: '(55) 41 94568-****',
      type: 'incoming',
      tags: [],
      date: '07/02/2026 • 17:28',
      hasTranscription: false,
    },
    {
      number: '0800 777 2345',
      type: 'outgoing',
      tags: ['Business'],
      date: '07/02/2026 • 17:28',
      hasTranscription: false,
    },
    {
      number: '(55) 87 91785-****',
      type: 'incoming',
      tags: ['Same Area Code'],
      date: '07/02/2026 • 17:28',
      hasTranscription: true,
      fullTranscription: [
        '[Contact]: Hey, come pick me up at the spot we agreed on?',
        '[Target]: What time will you be there?',
        '[Contact]: I\'ll be there in about 15 minutes.',
        '[Target]: Alright, I\'ll pick you up and we\'ll go straight there.',
        '[Contact]: To the motel?',
        '[Target]: Yeah, I already booked the room.',
        '[Contact]: Perfect! I can\'t wait to see you again...',
        '[Target]: Me too, I\'m leaving now.',
      ],
    },
    {
      number: '0800 123 4567',
      type: 'outgoing',
      tags: ['Business'],
      date: '06/02/2026 • 17:28',
      hasTranscription: true,
      transcriptionPreview: 'Hi! We have an exclusive credit offer for you...',
    },
    {
      number: '(55) 87 96130-****',
      type: 'incoming',
      tags: ['Same Area Code'],
      date: '06/02/2026 • 17:28',
      hasTranscription: true,
      transcriptionPreview: 'Hey babe',
    },
    {
      number: '(55) 87 93796-****',
      type: 'outgoing',
      tags: ['Same Area Code'],
      date: '06/02/2026 • 17:28',
      hasTranscription: false,
    },
  ];

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
            ← Back
          </button>
          <h1 className="text-white font-bold text-lg">Call Log</h1>
          <div className="w-12" />
        </motion.div>

        {calls.map((call, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                call.type === 'outgoing' ? 'bg-green-500/20' : 'bg-blue-500/20'
              }`}>
                {call.type === 'outgoing' ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-400 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm">{call.number}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    call.type === 'outgoing'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {call.type === 'outgoing' ? 'Outgoing' : 'Incoming'}
                  </span>
                  {call.tags.map((tag, i) => (
                    <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tag === 'Business'
                        ? 'bg-gray-600/30 text-gray-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-gray-500 text-xs">🕐</span>
                  <span className="text-gray-500 text-xs">{call.date}</span>
                </div>
              </div>
            </div>

            {call.fullTranscription && (
              <div className="mt-3 bg-[#1a1a2e] border border-purple-500/30 rounded-xl p-3">
                <p className="text-purple-400 text-xs font-semibold mb-2 flex items-center gap-1">
                  <span>🎙️</span> Audio transcription available
                </p>
                <div className="space-y-1">
                  {call.fullTranscription.map((line, i) => (
                    <p key={i} className="text-gray-300 text-xs leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            )}

            {call.hasTranscription && !call.fullTranscription && (
              <div className="mt-3 bg-[#1a1a2e] border border-purple-500/30 rounded-xl p-3">
                <p className="text-purple-400 text-xs font-semibold mb-1 flex items-center gap-1">
                  <span>🎙️</span> Audio transcription available
                </p>
                {call.transcriptionPreview && (
                  <p className="text-gray-400 text-xs mb-2">{call.transcriptionPreview}</p>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleTranscribe}
                  className="w-full py-2.5 rounded-lg font-semibold text-white text-xs"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7, #7c3aed)',
                  }}
                >
                  Transcribe audio for 30 credits
                </motion.button>
              </div>
            )}
          </motion.div>
        ))}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push(appendUtmToPath('/dashboard'))}
          className="w-full py-3 rounded-xl font-semibold text-gray-400 bg-[#0d0d14] border border-gray-800 text-sm mt-4"
        >
          ← Back to Dashboard
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

export default function CallsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallsContent />
    </Suspense>
  );
}
