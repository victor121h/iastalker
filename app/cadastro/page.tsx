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
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'src', 'sck', 'xcod', 'lang', 'username'];
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

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#121212',
            border: '1px solid #262626',
          }}
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #D62976, #FA7E1E, #FEDA75)' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h1 className="text-white text-2xl font-bold mb-2">
                Create your account
              </h1>
              <p className="text-sm text-[#A0A0A0]">
                Fill in your details to access AI Ghost
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#A0A0A0]">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder-[#666] focus:outline-none transition-all text-base"
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
                  required
                  autoComplete="off"
                  data-lpignore="true"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#A0A0A0]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder-[#666] focus:outline-none transition-all text-base"
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
                className="w-full py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90"
                style={{
                  background: isLoading
                    ? '#1a1a1a'
                    : 'linear-gradient(135deg, #D62976 0%, #FA7E1E 50%, #FEDA75 100%)',
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

            <p className="text-center text-xs mt-6 text-[#666]">
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
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0a0a' }} />}>
      <CadastroContent />
    </Suspense>
  );
}
