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
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082b 30%, #1c0c30 50%, #200e35 70%, #1a0a2e 100%)' }}
    >
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(138, 43, 226, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 140, 0, 0.08) 0%, transparent 50%)'
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 rounded-full bg-purple-400/30 animate-pulse" />
        <div className="absolute top-[30%] right-[10%] w-1.5 h-1.5 rounded-full bg-orange-400/25 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[25%] left-[15%] w-1 h-1 rounded-full bg-pink-400/20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-yellow-400/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 rounded-[22px] p-8 max-w-[380px] w-full"
        style={{
          background: 'linear-gradient(145deg, rgba(30, 15, 50, 0.9) 0%, rgba(20, 10, 35, 0.95) 100%)',
          border: '1px solid rgba(138, 43, 226, 0.2)',
          boxShadow: '0 0 60px rgba(138, 43, 226, 0.15), 0 0 120px rgba(255, 140, 0, 0.05), 0 25px 50px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="w-[56px] h-[56px] rounded-xl overflow-hidden" style={{ boxShadow: '0 0 25px rgba(138, 43, 226, 0.3)' }}>
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
            className="text-[15px] leading-relaxed"
            style={{ color: 'rgba(200, 180, 220, 0.7)' }}
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
                style={{ backgroundImage: 'linear-gradient(90deg, #C13584, #F77737)' }}
              >
                @
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter the person's @."
                className="w-full h-[48px] rounded-full px-12 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                style={{
                  background: 'rgba(138, 43, 226, 0.1)',
                  border: '1px solid rgba(138, 43, 226, 0.3)',
                }}
              />
              <button
                onClick={handleSubmit}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#C13584' }}
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
            className="flex items-center gap-2 text-[13px] pt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(200, 180, 220, 0.5)' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ color: 'rgba(200, 180, 220, 0.6)' }}>Only 1 search per person.</span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a2e' }}><div style={{ color: 'rgba(200, 180, 220, 0.5)' }}>Loading...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
