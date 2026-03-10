'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [inputUsername, setInputUsername] = useState('');
  const [searching, setSearching] = useState(false);

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const handleSearch = async () => {
    const cleanUsername = inputUsername.replace('@', '').trim();
    if (!cleanUsername) return;

    setSearching(true);

    let utmString = getUtmParams();
    try {
      const res = await fetch(`/api/user-utms?username=${encodeURIComponent(cleanUsername)}`);
      const data = await res.json();
      if (data.utms) {
        const params = new URLSearchParams(utmString);
        Object.entries(data.utms).forEach(([key, value]) => {
          params.set(key, value as string);
        });
        utmString = params.toString();
      }
    } catch (e) {}

    const redirectUrl = utmString ? `/cadastro?${utmString}` : '/cadastro';
    router.push(redirectUrl);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Search Profile</h2>
              <p className="text-gray-400 text-sm">Enter the @ of the profile you want to analyze</p>
            </div>

            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">@</span>
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputUsername.trim()) handleSearch();
                }}
                placeholder="username"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl py-4 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                autoFocus
                disabled={searching}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={!inputUsername.trim() || searching}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {searching ? 'Searching...' : 'Spy'}
            </button>

            <p className="text-gray-500 text-xs text-center mt-4">
              The report will be generated based on public profile information
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AccessContent />
    </Suspense>
  );
}
