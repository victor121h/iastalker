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

  const particles = [
    { width: 8, height: 8, left: '15%', top: '20%', duration: 4, delay: 0 },
    { width: 12, height: 12, left: '80%', top: '15%', duration: 6, delay: 1 },
    { width: 6, height: 6, left: '60%', top: '70%', duration: 5, delay: 2 },
    { width: 10, height: 10, left: '25%', top: '75%', duration: 7, delay: 0.5 },
    { width: 7, height: 7, left: '90%', top: '50%', duration: 4.5, delay: 1.5 },
  ];

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0518 50%, #1a0a2e 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(138,43,226,0.15) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(252,175,69,0.08) 0%, transparent 50%)' }} />
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              top: p.top,
              background: 'linear-gradient(135deg, #8B2FC9, #FCAF45)',
              opacity: 0.4,
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

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
              background: 'linear-gradient(145deg, rgba(30, 15, 50, 0.9) 0%, rgba(20, 10, 35, 0.95) 100%)',
              border: '1px solid rgba(138, 43, 226, 0.25)',
              boxShadow: '0 0 60px rgba(138, 43, 226, 0.15), 0 30px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #8B2FC9, #E1306C, #FCAF45)' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>

              <h2 className="text-white text-2xl font-bold mb-2">Search Profile</h2>
              <p className="text-sm" style={{ color: 'rgba(200, 180, 220, 0.7)' }}>
                Enter the @ of the profile you want to analyze
              </p>
            </div>

            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>@</span>
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputUsername.trim()) handleSearch();
                }}
                placeholder="username"
                className="w-full rounded-xl py-4 pl-10 pr-4 text-white placeholder-[rgba(200,180,220,0.3)] focus:outline-none transition-all text-base"
                style={{
                  background: 'rgba(138, 43, 226, 0.08)',
                  border: '1px solid rgba(138, 43, 226, 0.3)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(138, 43, 226, 0.7)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(138, 43, 226, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(138, 43, 226, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                autoFocus
                disabled={searching}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={!inputUsername.trim() || searching}
              className="w-full text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: inputUsername.trim() && !searching
                  ? 'linear-gradient(90deg, #8B2FC9, #E1306C, #FCAF45)'
                  : 'rgba(100, 60, 140, 0.4)',
                boxShadow: inputUsername.trim() && !searching ? '0 4px 20px rgba(138, 43, 226, 0.4)' : 'none',
              }}
            >
              {searching ? 'Searching...' : 'Spy Now'}
            </button>

            <p className="text-center text-xs mt-5" style={{ color: 'rgba(200, 180, 220, 0.4)' }}>
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
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0518 50%, #1a0a2e 100%)' }} />}>
      <AccessContent />
    </Suspense>
  );
}
