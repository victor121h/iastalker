'use client';

import { motion } from 'framer-motion';
import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchContent() {
  const [username, setUsername] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const capturedUtmsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const currentUtms: Record<string, string> = {};

    const urlParams = new URLSearchParams(window.location.search);
    utmKeys.forEach(key => {
      const value = urlParams.get(key);
      if (value) currentUtms[key] = value;
    });

    if (Object.keys(currentUtms).length > 0) {
      capturedUtmsRef.current = currentUtms;
      try {
        localStorage.setItem('pending_utms', JSON.stringify(currentUtms));
      } catch (e) {}
    } else {
      try {
        const stored = localStorage.getItem('pending_utms');
        if (stored) {
          capturedUtmsRef.current = JSON.parse(stored);
        }
      } catch (e) {}
    }

    const hasVisited = document.cookie.includes('deepgram_visited=true');
    if (hasVisited) {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      const savedUsername = cookies['pitch_username'] || '';

      if (savedUsername && Object.keys(capturedUtmsRef.current).length > 0) {
        const utmParts = Object.entries(capturedUtmsRef.current).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
        fetch(`/api/track-utms?username=${encodeURIComponent(savedUsername.toLowerCase())}&${utmParts}`).catch(() => {});
      }

      const params = new URLSearchParams();
      if (savedUsername) params.set('username', savedUsername);
      Object.entries(capturedUtmsRef.current).forEach(([key, value]) => {
        params.set(key, value);
      });
      const queryString = params.toString();
      router.replace(queryString ? `/pitch?${queryString}` : '/pitch');
    }
  }, []);

  const getUtmsFromCookies = (): Record<string, string> => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const utms: Record<string, string> = {};
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key.trim()] = decodeURIComponent(value.trim());
      return acc;
    }, {} as Record<string, string>);

    utmKeys.forEach(key => {
      const cookieValue = cookies[`_utm_${key}`];
      if (cookieValue) utms[key] = cookieValue;
    });
    return utms;
  };

  const handleSubmit = async () => {
    if (username.trim()) {
      const cleanUser = username.trim().toLowerCase();

      const urlUtms = { ...capturedUtmsRef.current };
      const cookieUtms = getUtmsFromCookies();
      const utmObj = { ...cookieUtms, ...urlUtms };

      let finalUtmParams = '';

      if (Object.keys(utmObj).length > 0) {
        const params = new URLSearchParams();
        Object.entries(utmObj).forEach(([key, value]) => {
          params.set(key, value);
        });
        finalUtmParams = params.toString();

        try {
          await fetch(`/api/track-utms?username=${encodeURIComponent(cleanUser)}&${finalUtmParams}`);
        } catch (e) {
          console.error('[search] Failed to save UTMs:', e);
        }
      }

      const baseParams = `username=${encodeURIComponent(username)}`;
      if (finalUtmParams) {
        router.push(`/confirm?${baseParams}&${finalUtmParams}`);
      } else {
        router.push(`/confirm?${baseParams}`);
      }
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 rounded-[22px] p-8 max-w-[380px] w-full"
        style={{
          background: '#121212',
          border: '1px solid #262626',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="w-[56px] h-[56px] rounded-xl overflow-hidden">
              <img src="/ghost-logo.png" alt="AI Ghost" className="w-full h-full object-cover" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="text-[26px] md:text-[28px] font-bold text-white leading-tight"
          >
            What does he/she really do when on Insta?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-[15px] leading-relaxed text-[#A0A0A0]"
          >
            Discover the truth about anyone on Instagram. Just with the @.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="w-full"
          >
            <div className="relative">
              <div
                className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #D62976, #FA7E1E)' }}
              >
                @
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter the person's @."
                className="w-full h-[48px] rounded-full px-12 text-white placeholder:text-[#666] focus:outline-none focus:border-[#FA7E1E] transition-all"
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #262626',
                }}
              />
              <button
                onClick={handleSubmit}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#FA7E1E' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="flex items-center gap-2 text-[13px] pt-1 text-[#808080]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
            </svg>
            <span>Only 1 search per person.</span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}><div className="text-[#808080]">Loading...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
