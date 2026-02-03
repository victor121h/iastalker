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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    localStorage.setItem('user_name', name);
    localStorage.setItem('user_email', email);
    setTimeout(() => {
      router.push(appendUtmToPath('/dashboard'));
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#121212] border border-[#262626] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-gray-400 text-sm">Fill in your details to access IA Observer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                isLoading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              }`}
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

          <p className="text-center text-gray-500 text-xs mt-6">
            By registering, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950" />}>
      <CadastroContent />
    </Suspense>
  );
}
