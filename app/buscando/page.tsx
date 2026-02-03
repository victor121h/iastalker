'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Stage = 'input' | 'analyzing' | 'accelerating';

interface Step {
  text: string;
  status: 'completed' | 'loading' | 'pending';
}

export default function BuscandoPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('input');
  const [username, setUsername] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [accelerateProgress, setAccelerateProgress] = useState(0);
  const [accelerateStepIndex, setAccelerateStepIndex] = useState(0);

  const analysisSteps: Step[] = [
    { text: 'Profile found', status: currentStepIndex > 0 ? 'completed' : currentStepIndex === 0 ? 'loading' : 'pending' },
    { text: 'Accessing feed and stories...', status: currentStepIndex > 1 ? 'completed' : currentStepIndex === 1 ? 'loading' : 'pending' },
    { text: 'Retrieving private messages...', status: currentStepIndex > 2 ? 'completed' : currentStepIndex === 2 ? 'loading' : 'pending' },
    { text: 'Analyzing stalkers list...', status: currentStepIndex > 3 ? 'completed' : currentStepIndex === 3 ? 'loading' : 'pending' },
    { text: 'Mapping hidden likes...', status: currentStepIndex > 4 ? 'completed' : currentStepIndex === 4 ? 'loading' : 'pending' },
    { text: 'Generating complete report...', status: currentStepIndex > 5 ? 'completed' : currentStepIndex === 5 ? 'loading' : 'pending' },
  ];

  const accelerateSteps = [
    { text: 'Analyzing password...', status: accelerateStepIndex > 0 ? 'completed' : accelerateStepIndex === 0 ? 'loading' : 'pending' },
    { text: 'Testing new passwords...', status: accelerateStepIndex > 1 ? 'completed' : accelerateStepIndex === 1 ? 'loading' : 'pending' },
    { text: 'Decrypting...', status: accelerateStepIndex > 2 ? 'completed' : accelerateStepIndex === 2 ? 'loading' : 'pending' },
    { text: 'Validating...', status: accelerateStepIndex > 3 ? 'completed' : accelerateStepIndex === 3 ? 'loading' : 'pending' },
    { text: 'Accessing...', status: accelerateStepIndex > 4 ? 'completed' : accelerateStepIndex === 4 ? 'loading' : 'pending' },
  ];

  useEffect(() => {
    if (stage === 'analyzing') {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 18) return 18;
          return prev + 1;
        });
      }, 500);

      const stepInterval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= 3) return 3;
          return prev + 1;
        });
      }, 2000);

      return () => {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
      };
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'accelerating') {
      const progressInterval = setInterval(() => {
        setAccelerateProgress(prev => {
          if (prev >= 40) return 40;
          return prev + 1;
        });
      }, 200);

      const stepInterval = setInterval(() => {
        setAccelerateStepIndex(prev => {
          if (prev >= 1) return 1;
          return prev + 1;
        });
      }, 3000);

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
    setStage('accelerating');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
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
                <span className="text-purple-400 font-bold">{progress}%</span>
              </div>

              <div className="w-full h-1 bg-gray-700 rounded-full mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="border-t border-gray-700 pt-4 mb-6">
                <div className="space-y-3">
                  {analysisSteps.map((step, index) => (
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
                <p className="text-gray-400 text-sm">Progress: {progress}% • Estimated time: 5 days</p>
                <p className="text-yellow-400 text-sm">Your credits: 200</p>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
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
                Accelerate for 60 credits
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'accelerating' && (
          <motion.div
            key="accelerating"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-[#12121a] rounded-2xl p-8 border border-green-500/30">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="animate-spin">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                </div>
              </div>

              <h2 className="text-center text-gray-400 text-sm tracking-widest mb-6">PROCESS IN PROGRESS</h2>

              <div className="space-y-3 mb-8">
                {accelerateSteps.map((step, index) => (
                  <div key={index} className="flex items-center justify-center gap-3">
                    {step.status === 'completed' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    ) : step.status === 'loading' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
                    ) : null}
                    <span className={step.status === 'pending' ? 'text-gray-500' : step.status === 'completed' ? 'text-green-400' : 'text-white'}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${accelerateProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
