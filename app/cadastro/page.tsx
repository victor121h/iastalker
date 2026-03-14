'use client';

import { motion } from 'framer-motion';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'src', 'sck', 'xcod', 'lang'];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password: 'auto_' + Date.now(), name }),
      });
      const data = await res.json();

      if (data.success || data.error === 'already_registered') {
        localStorage.setItem('user_name', name);
        localStorage.setItem('user_email', email.toLowerCase().trim());
        setTimeout(() => {
          router.push(appendUtmToPath('/dashboard'));
        }, 1000);
      } else {
        setError(data.message || 'An error occurred.');
        setIsLoading(false);
      }
    } catch {
      setError('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  const particles = [
    { width: 8, height: 8, left: '10%', top: '25%', duration: 4, delay: 0 },
    { width: 12, height: 12, left: '85%', top: '10%', duration: 6, delay: 1 },
    { width: 6, height: 6, left: '65%', top: '75%', duration: 5, delay: 2 },
    { width: 10, height: 10, left: '20%', top: '80%', duration: 7, delay: 0.5 },
    { width: 7, height: 7, left: '92%', top: '55%', duration: 4.5, delay: 1.5 },
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(30, 15, 50, 0.9) 0%, rgba(20, 10, 35, 0.95) 100%)',
            border: '1px solid rgba(138, 43, 226, 0.25)',
            boxShadow: '0 0 60px rgba(138, 43, 226, 0.15), 0 30px 60px rgba(0,0,0,0.4)',
          }}
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #8B2FC9, #E1306C, #FCAF45)' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h1 className="text-white text-2xl font-bold mb-2">
                Create your account
              </h1>
              <p className="text-sm" style={{ color: 'rgba(200, 180, 220, 0.7)' }}>
                Fill in your details to access AI Ghost
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(200, 180, 220, 0.8)' }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder-[rgba(200,180,220,0.3)] focus:outline-none transition-all text-base"
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
                  required
                  autoComplete="off"
                  data-lpignore="true"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(200, 180, 220, 0.8)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder-[rgba(200,180,220,0.3)] focus:outline-none transition-all text-base"
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
                  required
                  autoComplete="off"
                  data-lpignore="true"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(229, 57, 53, 0.1)', border: '1px solid rgba(229, 57, 53, 0.3)' }}
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl font-bold text-white text-base transition-all"
                style={{
                  background: isLoading
                    ? 'rgba(100, 60, 140, 0.4)'
                    : 'linear-gradient(90deg, #8B2FC9, #E1306C, #FCAF45)',
                  boxShadow: isLoading ? 'none' : '0 4px 20px rgba(138, 43, 226, 0.4)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </motion.button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: 'rgba(200, 180, 220, 0.4)' }}>
              By registering, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0518 50%, #1a0a2e 100%)' }} />}>
      <CadastroContent />
    </Suspense>
  );
}
