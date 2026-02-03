'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isBreaking, setIsBreaking] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBreaking(false);
          setTimeout(() => {
            router.push('/feed');
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[350px]"
        >
          <div className="bg-[#000000] border border-[#262626] rounded-sm p-10">
            {/* Instagram Logo */}
            <div className="text-center mb-6">
              <h1 
                className="text-5xl text-white"
                style={{ fontFamily: "'Billabong', cursive" }}
              >
                Instagram
              </h1>
            </div>

            {/* Form fields */}
            <div className="space-y-2 mb-4">
              <input
                type="text"
                value="user"
                readOnly
                className="w-full px-3 py-[9px] rounded-[3px] bg-[#121212] border border-[#262626] text-white text-sm placeholder-gray-500 outline-none"
              />
              <div className="relative">
                <input
                  type="password"
                  value="••••••••••••"
                  readOnly
                  className="w-full px-3 py-[9px] rounded-[3px] bg-[#121212] border border-[#262626] text-white text-sm placeholder-gray-500 outline-none pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="text-[#0095f6] text-lg"
                  >
                    ↻
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Breaking encryption status */}
            <div className="bg-[#1c1c1c] rounded-lg p-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-orange-500 text-xl">⚙️</div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">Breaking account encryption</p>
                  <p className="text-gray-400 text-xs">Testing password combinations...</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-[#262626] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-500 to-red-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>

            {/* Login button */}
            <button
              disabled
              className="w-full bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Logging in...
            </button>

            {/* Forgot password */}
            <div className="text-center mt-4">
              <a href="#" className="text-[#a8a8a8] text-xs hover:text-white">
                Forgot password?
              </a>
            </div>

            {/* Divider */}
            <div className="flex items-center my-5">
              <div className="flex-1 h-px bg-[#262626]"></div>
              <span className="px-4 text-gray-500 text-sm font-semibold">OR</span>
              <div className="flex-1 h-px bg-[#262626]"></div>
            </div>

            {/* Facebook login */}
            <button className="w-full flex items-center justify-center gap-2 text-[#0095f6] font-semibold text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Log in with Facebook
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom signup section */}
      <div className="pb-8">
        <div className="max-w-[350px] mx-auto">
          <div className="bg-[#000000] border border-[#262626] rounded-sm p-5 text-center">
            <p className="text-white text-sm">
              Don't have an account?{' '}
              <Link href="/cadastro" className="text-[#0095f6] font-semibold hover:text-white">
                Sign up.
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Custom font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Billabong&display=swap');
      `}</style>
    </div>
  );
}
