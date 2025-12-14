'use client';

import { motion } from 'framer-motion';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AppContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0C1011] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-[#1A1A1A] rounded-[22px] p-8 max-w-md w-full border border-[#00FF75]/30"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-[#00FF75]/20 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-4">
            Account Created Successfully!
          </h1>

          <div className="bg-[#0D2818] border border-[#00FF75]/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00FF75] flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold mb-2">Important Notice</p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Within <span className="text-[#00FF75] font-bold">5 to 16 days</span>, a member of our team will call you to help install the application on your phone.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#1F1F1F] rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-sm text-center">
              Email registered: <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#00FF75">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span>Keep your phone nearby</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#00FF75">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span>Answer calls from unknown numbers</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#00FF75">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span>Installation takes only 5 minutes</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C1011] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#1A1A1A] rounded-[22px] p-8 max-w-md w-full border border-gray-800"
      >
        <div className="flex justify-center mb-6">
          <img 
            src="/logo-stalker.png" 
            alt="IA Stalker Logo" 
            className="w-20 h-20 rounded-xl"
          />
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Create Your Account
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Enter your email to get started with IA Stalker
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#0C1011] border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#EB1C8F] transition-colors"
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-center font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #EB1C8F, #FA7E1E)' }}
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <div className="bg-[#2D1A1F] border border-[#EB1C8F]/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#EB1C8F">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              <p className="text-gray-300 text-sm">
                After registration, our team will contact you within <span className="text-[#EB1C8F] font-semibold">5 to 16 days</span> to install the app on your phone.
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          Your data is protected with SSL encryption
        </p>
      </motion.div>
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C1011] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <AppContent />
    </Suspense>
  );
}
