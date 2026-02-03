'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCredits, deductCredits, hasSearched, setSearchDone } from '@/lib/credits';

type Stage = 'input' | 'analyzing' | 'completed';

function BuscandoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>('input');
  const [username, setUsername] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showNoCreditsPopup, setShowNoCreditsPopup] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(200);
  const [alreadySearched, setAlreadySearched] = useState(false);

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
    if (utmParams) {
      return `${basePath}?${utmParams}`;
    }
    return basePath;
  };

  useEffect(() => {
    setCurrentCredits(getCredits());
    setAlreadySearched(hasSearched());
  }, []);

  const getAnalysisSteps = () => [
    { text: 'Profile found', status: currentStepIndex > 0 ? 'completed' : currentStepIndex === 0 ? 'loading' : 'pending' },
    { text: 'Accessing feed and stories...', status: currentStepIndex > 1 ? 'completed' : currentStepIndex === 1 ? 'loading' : 'pending' },
    { text: 'Retrieving private messages...', status: currentStepIndex > 2 ? 'completed' : currentStepIndex === 2 ? 'loading' : 'pending' },
    { text: 'Analyzing stalkers list...', status: currentStepIndex > 3 ? 'completed' : currentStepIndex === 3 ? 'loading' : 'pending' },
    { text: 'Mapping hidden likes...', status: currentStepIndex > 4 ? 'completed' : currentStepIndex === 4 ? 'loading' : 'pending' },
    { text: 'Generating complete report...', status: currentStepIndex > 5 ? 'completed' : currentStepIndex === 5 ? 'loading' : 'pending' },
  ];

  const getMaskedEmail = () => {
    const prefix = username.slice(0, 3).toLowerCase();
    return `${prefix}******@gmail.com`;
  };

  useEffect(() => {
    if (stage === 'analyzing') {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 18) return 18;
          return prev + 0.005;
        });
      }, 1000);

      const stepInterval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= 1) return 1;
          return prev + 1;
        });
      }, 30000);

      return () => {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
      };
    }
  }, [stage]);

  const handleStartInvestigation = () => {
    if (username.trim()) {
      setStage('analyzing');
    }
  };

  const handleAccelerate = () => {
    if (deductCredits(25)) {
      setSearchDone();
      setCurrentCredits(getCredits());
      setStage('completed');
    } else {
      setShowNoCreditsPopup(true);
    }
  };

  const handleUnlockEmail = () => {
    setShowNoCreditsPopup(true);
  };

  const handleBuyCredits = () => {
    router.push(appendUtmToPath('/buy'));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <AnimatePresence>
        {showNoCreditsPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNoCreditsPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a24] rounded-2xl p-6 max-w-sm w-full border border-red-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-white text-xl font-bold text-center mb-2">Insufficient Credits!</h2>
              <p className="text-gray-400 text-center mb-6">
                You don&apos;t have enough credits to unlock this email. Purchase more credits to continue your investigation.
              </p>
              <button
                onClick={handleBuyCredits}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
              >
                Buy More Credits
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {stage === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-white text-xl font-bold">Investigate Instagram</h1>
                  <p className="text-gray-400 text-sm">Discover hidden followers, conversations, stalkers and much more.</p>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <p className="text-purple-300 text-sm">
                  <span className="text-purple-400 font-semibold">Tip:</span> enter exactly as it appears on Instagram. No need to add @, capital letters or spaces.
                </p>
              </div>

              <div className="mb-6">
                <label className="text-white font-semibold text-sm mb-2 block">
                  Enter username (without @)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: lucas_silva10"
                    className="w-full bg-[#12121a] border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleStartInvestigation}
                disabled={!username.trim()}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start investigation
              </button>

              <p className="text-center text-gray-400 text-sm mt-4 flex items-center justify-center gap-2">
                <span>🎁</span> Free investigation, no credits spent.
              </p>
            </div>
          </motion.div>
        )}

        {stage === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-white text-lg font-bold">@{username}</h1>
                    <p className="text-gray-400 text-sm">Analyzing profile...</p>
                  </div>
                </div>
                <span className="text-purple-400 font-bold">{Math.floor(progress)}%</span>
              </div>

              <div className="w-full h-1 bg-gray-700 rounded-full mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="border-t border-gray-700 pt-4 mb-6">
                <div className="space-y-3">
                  {getAnalysisSteps().map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {step.status === 'completed' ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                        </div>
                      ) : step.status === 'loading' ? (
                        <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-600" />
                      )}
                      <span className={step.status === 'pending' ? 'text-gray-500' : step.status === 'completed' ? 'text-green-400' : 'text-white'}>
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#12121a] rounded-xl p-4 mb-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                  <span className="text-white font-semibold">Analysis in progress</span>
                </div>
                <p className="text-gray-400 text-sm">Progress: {Math.floor(progress)}% • Estimated time: 1 hour</p>
                <p className="text-yellow-400 text-sm">Your credits: 200</p>
              </div>

              <button
                onClick={() => router.push(appendUtmToPath('/dashboard'))}
                className="w-full py-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors mb-3"
              >
                Cancel Investigation
              </button>

              <p className="text-center text-gray-400 text-sm mb-3">
                The analysis is taking longer...
              </p>

              <button
                onClick={handleAccelerate}
                className="w-full py-4 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Accelerate for 25 credits
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-4"
          >
            <div className="bg-[#1a1a24] rounded-2xl p-6 border border-orange-500/30">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-orange-400 text-lg font-bold">Process not completed, requires 2-factor authentication!</h1>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <span>Instagram password discovered successfully</span>
                </div>
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  <span>Need email to login</span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-2">
                Instagram is requesting a verification code that was sent to the email
              </p>
              <p className="text-purple-400 font-semibold mb-4">{getMaskedEmail()}</p>

              <p className="text-purple-300 text-sm mb-4">
                You need to unlock this email to get the code
              </p>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                <p className="text-gray-300 text-sm">
                  We will access the email <span className="text-purple-400 font-semibold">{getMaskedEmail()}</span>, get the verification code that Instagram sent and login with the password.
                </p>
                <p className="text-yellow-400 text-sm mt-2">Estimated time: up to 36 hours</p>
              </div>

              <button
                onClick={handleUnlockEmail}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
              >
                Unlock Email for 50 credits
              </button>
            </div>

            <div className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-blue-400">📋</span>
                <h2 className="text-white font-bold">Basic Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Username</p>
                  <p className="text-white font-semibold">@{username}</p>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-gray-500 text-xs mb-1">Account Status</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-white font-semibold">Active</span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-gray-500 text-xs mb-1">Privacy Level</p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    High • Encryption Enabled
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(appendUtmToPath('/dashboard'))}
              className="w-full py-4 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Delete Investigation
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BuscandoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <BuscandoContent />
    </Suspense>
  );
}
