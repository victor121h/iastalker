'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const navigateWithParams = (path: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      router.push(`${path}?${utmParams}`);
    } else {
      router.push(path);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#000000' }}
    >
      {/* Blue ambient glows */}
      <motion.div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          width: '520px',
          height: '520px',
          top: '-160px',
          left: '-160px',
          background: 'radial-gradient(circle, rgba(30, 144, 255, 0.35) 0%, rgba(30, 144, 255, 0) 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          width: '600px',
          height: '600px',
          bottom: '-200px',
          right: '-180px',
          background: 'radial-gradient(circle, rgba(0, 102, 204, 0.4) 0%, rgba(0, 102, 204, 0) 70%)',
          filter: 'blur(50px)',
        }}
        animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          width: '380px',
          height: '380px',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.18) 0%, rgba(0, 212, 255, 0) 70%)',
          filter: 'blur(30px)',
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59, 130, 246, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* Floating blue particles */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { top: '12%', left: '8%', size: 6, delay: 0 },
          { top: '22%', left: '85%', size: 4, delay: 1 },
          { top: '70%', left: '12%', size: 5, delay: 2 },
          { top: '80%', left: '78%', size: 3, delay: 0.7 },
          { top: '35%', left: '92%', size: 4, delay: 1.4 },
          { top: '55%', left: '5%', size: 3, delay: 2.2 },
        ].map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              background: '#3B82F6',
              boxShadow: '0 0 12px #3B82F6, 0 0 24px rgba(59, 130, 246, 0.6)',
            }}
            animate={{ y: [0, -18, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 rounded-[22px] p-8 max-w-[380px] w-full"
        style={{
          background: 'rgba(10, 14, 24, 0.85)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow:
            '0 0 0 1px rgba(59, 130, 246, 0.08), 0 20px 60px rgba(0, 102, 204, 0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div
              className="w-[72px] h-[72px] rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(0, 102, 204, 0.3)',
              }}
            >
              <img src="/ghost-logo.png" alt="AI Ghost" className="w-full h-full object-cover" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="text-[26px] md:text-[28px] font-bold leading-tight text-white"
          >
            What do they really do when they&apos;re on Insta?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-[15px] leading-relaxed text-[#A0B4D6]"
          >
            Discover the truth about anyone on Instagram. Just with their @.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="w-full pt-2 flex justify-center"
          >
            <button
              onClick={() => navigateWithParams('/search')}
              className="px-8 h-[48px] rounded-full font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #1E90FF 50%, #0066CC 100%)',
                boxShadow:
                  '0 8px 24px rgba(30, 144, 255, 0.45), 0 0 0 1px rgba(0, 212, 255, 0.4) inset',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" />
                <circle cx="18" cy="6" r="1.5" fill="white" />
              </svg>
              Spy Now
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="flex items-center gap-2 text-[13px] pt-1 text-[#7A93BD]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 11H5V21H19V11Z" />
              <path d="M17 11V7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7V11" />
            </svg>
            <span>
              100% Anonymous. They will{' '}
              <span
                className="font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #00D4FF, #1E90FF)' }}
              >
                NEVER
              </span>
              {' '}know.
            </span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
          <div className="text-[#7A93BD]">Loading...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
