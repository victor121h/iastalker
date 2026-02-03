'use client';

import { motion } from 'framer-motion';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shareCount] = useState(1);
  const [isSharing, setIsSharing] = useState(false);

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

  const handleShare = () => {
    setIsSharing(true);
    setTimeout(() => {
      setIsSharing(false);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] p-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push(appendUtmToPath('/dashboard'))}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12121a] border border-[#262626] rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-[#1a1a2e] rounded-full flex items-center justify-center border-2 border-purple-500/30">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#666">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold">user@email.com</h2>
              <p className="text-gray-500 text-sm">user@email.com</p>
            </div>
            <button className="text-purple-400 hover:text-purple-300 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1a2e] rounded-xl p-4 text-center border border-[#333]">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Level
              </div>
              <p className="text-white text-2xl font-bold">2</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-xl p-4 text-center border border-[#333]">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-2">
                <span className="text-yellow-400">⚡</span>
                Credits
              </div>
              <p className="text-white text-2xl font-bold">25</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-xl p-4 text-center border border-[#333]">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-2">
                <span className="text-blue-400">🏆</span>
                XP
              </div>
              <p className="text-white text-2xl font-bold">60</p>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between items-center mb-2">
              <p className="text-white font-semibold">Progress to Level 3</p>
              <p className="text-gray-400 text-sm">60/200 XP</p>
            </div>
            <div className="w-full h-3 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12121a] border border-[#262626] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl">🏆</span>
            <h3 className="text-white font-bold text-lg">Achievements (1/5)</h3>
          </div>

          <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🚀</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white font-bold">Ambassador</h4>
                  <span className="text-yellow-400 text-sm font-bold">+200 ⚡</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">Share the app 20 times</p>
                <p className="text-gray-500 text-xs mb-3">{shareCount} of 20</p>
                <div className="w-full h-2 bg-[#0a0a0f] rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" 
                    style={{ width: `${(shareCount / 20) * 100}%` }}
                  ></div>
                </div>
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isSharing
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400'
                  }`}
                >
                  {isSharing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Sharing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                      </svg>
                      Share Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a2e] border border-green-500/30 rounded-xl p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white font-bold">First Spy</h4>
                  <span className="text-green-400 text-sm font-bold">+10 ⚡</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">Complete your first investigation</p>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg py-2 px-4 text-center">
                  <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    Reward claimed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <ProfileContent />
    </Suspense>
  );
}
