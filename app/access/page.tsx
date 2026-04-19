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

    let params = new URLSearchParams(getUtmParams());
    params.set('username', cleanUsername);
    try {
      const res = await fetch(`/api/user-utms?username=${encodeURIComponent(cleanUsername)}`);
      const data = await res.json();
      if (data.utms) {
        Object.entries(data.utms).forEach(([key, value]) => {
          params.set(key, value as string);
        });
      }
    } catch (e) {}

    const utmString = params.toString();
    const redirectUrl = `https://aighostapp.replit.app/cadastro?${utmString}`;
    window.location.href = redirectUrl;
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#121212',
              border: '1px solid #262626',
            }}
          >
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #D62976, #FA7E1E, #FEDA75)' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>

              <h2 className="text-white text-2xl font-bold mb-2">Search Profile</h2>
              <p className="text-sm text-[#A0A0A0]">
                Enter the @ of the profile you want to analyze
              </p>
            </div>

            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[#808080]">@</span>
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputUsername(val);
                  const clean = val.replace('@', '').trim();
                  const url = new URL(window.location.href);
                  if (clean) {
                    url.searchParams.set('username', clean);
                  } else {
                    url.searchParams.delete('username');
                  }
                  window.history.replaceState({}, '', url.toString());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputUsername.trim()) handleSearch();
                }}
                placeholder="username"
                className="w-full rounded-xl py-4 pl-10 pr-4 text-white placeholder-[#666] focus:outline-none transition-all text-base"
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #262626',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid #FA7E1E';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid #262626';
                }}
                autoFocus
                disabled={searching}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={!inputUsername.trim() || searching}
              className="w-full text-white font-bold py-4 rounded-xl transition-all transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: inputUsername.trim() && !searching
                  ? 'linear-gradient(135deg, #D62976 0%, #FA7E1E 50%, #FEDA75 100%)'
                  : '#1a1a1a',
              }}
            >
              {searching ? 'Searching...' : 'Spy Now'}
            </button>

            <p className="text-center text-xs mt-5 text-[#666]">
              The report will be generated based on public profile information
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0a0a' }} />}>
      <AccessContent />
    </Suspense>
  );
}
