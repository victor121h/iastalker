'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function OutrosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showNoCreditsPopup, setShowNoCreditsPopup] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [userEmail, setUserEmail] = useState('');

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

  const handleUnlock = async () => {
    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: 50 }),
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

  const socialNetworks = [
    { name: 'Instagram', icon: '📷', color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    { name: 'Facebook', icon: '👤', color: 'bg-blue-600' },
    { name: 'WhatsApp', icon: '💬', color: 'bg-green-500' },
    { name: 'TikTok', icon: '🎵', color: 'bg-gray-800' },
    { name: 'Threads', icon: '🔗', color: 'bg-gray-700' },
    { name: 'Twitter/X', icon: '✖', color: 'bg-gray-800' },
    { name: 'YouTube', icon: '▶️', color: 'bg-red-600' },
    { name: 'Telegram', icon: '✈️', color: 'bg-blue-500' },
  ];

  const datingSites = [
    { name: 'Tinder', icon: '🔥', color: 'bg-gradient-to-br from-pink-500 to-red-500' },
    { name: 'Bumble', icon: '🐝', color: 'bg-yellow-500' },
    { name: 'Badoo', icon: '💜', color: 'bg-purple-600' },
    { name: 'Grindr', icon: '🟡', color: 'bg-yellow-600' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <div className="w-full max-w-md mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div>
              <h2 className="text-white font-bold">Search Data</h2>
              <p className="text-gray-400 text-sm">Information used for tracking</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-4 gap-3"
        >
          <div className="bg-[#0d0d14] border border-green-500/30 rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-xl">13</p>
            <p className="text-gray-400 text-xs">Active</p>
          </div>
          <div className="bg-[#0d0d14] border border-purple-500/30 rounded-xl p-3 text-center">
            <p className="text-purple-400 font-bold text-xl">4</p>
            <p className="text-gray-400 text-xs">Suspicious</p>
          </div>
          <div className="bg-[#0d0d14] border border-gray-700 rounded-xl p-3 text-center">
            <p className="text-gray-400 font-bold text-xl">30</p>
            <p className="text-gray-400 text-xs">No Account</p>
          </div>
          <div className="bg-[#0d0d14] border border-purple-500/30 rounded-xl p-3 text-center">
            <p className="text-purple-400 font-bold text-xl">47</p>
            <p className="text-gray-400 text-xs">Total</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            📱 Social Networks Found
          </h3>

          <div className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-green-400">✅</span>
              <span><strong className="text-white">Confirmed profiles</strong> found in the search</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {socialNetworks.map((network, index) => (
                <motion.div
                  key={network.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + index * 0.03 }}
                  className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-3 flex items-center gap-2"
                >
                  <div className={`w-8 h-8 rounded-lg ${network.color} flex items-center justify-center text-sm flex-shrink-0`}>
                    {network.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{network.name}</p>
                    <p className="text-green-400 text-[10px]">Active</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            💘 Dating Sites
          </h3>

          <div className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-yellow-500">⚠️</span>
              <span><strong className="text-white">4 profiles found</strong> linked to the provided data</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {datingSites.map((site, index) => (
                <motion.div
                  key={site.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg ${site.color} flex items-center justify-center text-lg flex-shrink-0`}>
                    {site.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{site.name}</p>
                    <p className="text-green-400 text-xs">Active</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-700/50 pt-4">
              <div className="text-center mb-3">
                <p className="text-white font-bold text-sm flex items-center justify-center gap-1">
                  🚀 Complete Package
                </p>
                <p className="text-gray-400 text-xs">Tinder + Bumble + Badoo + Grindr</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleUnlock}
                className="w-full py-3 rounded-xl font-bold text-white text-sm"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316, #ef4444)',
                }}
              >
                Unlock for 50 credits
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push(appendUtmToPath('/dashboard'))}
          className="w-full py-3 rounded-xl font-semibold text-gray-400 bg-[#0d0d14] border border-gray-800 text-sm"
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

export default function OutrosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OutrosContent />
    </Suspense>
  );
}
