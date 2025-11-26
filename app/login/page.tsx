'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('ovictortv');
  const [password, setPassword] = useState('••••••••••');
  const router = useRouter();

  const handleLogin = () => {
    router.push('/feed');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-instagram-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center text-center space-y-8 bg-instagram-card border border-instagram-border rounded-instagram p-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
          >
            <svg
              width="175"
              height="51"
              viewBox="0 0 175 51"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path
                d="M102.5 8.5h15M102.5 19h15M102.5 29.5h15M102.5 40h15"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <text
                x="10"
                y="35"
                fill="currentColor"
                fontSize="42"
                fontFamily="'Brush Script MT', cursive"
                fontStyle="italic"
              >
                Instagram
              </text>
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="w-full space-y-2"
          >
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-[38px] bg-instagram-input border border-instagram-border rounded-sm px-3 text-xs text-white placeholder:text-instagram-text-medium focus:outline-none focus:ring-1 focus:ring-instagram-text-medium transition-all"
            />
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[38px] bg-instagram-input border border-instagram-border rounded-sm px-3 text-xs text-white placeholder:text-instagram-text-medium focus:outline-none focus:ring-1 focus:ring-instagram-text-medium transition-all"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="w-full space-y-4"
          >
            <div className="flex items-center gap-3 bg-instagram-input/50 rounded-lg p-3">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-white text-sm font-medium">Quebrando criptografia da conta</div>
                <div className="text-instagram-text-medium text-xs">Testando combinações de senha...</div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleLogin}
              className="w-full h-[44px] bg-instagram-blue text-white rounded-full font-bold text-sm hover:bg-instagram-blue/90 transition-all cursor-pointer"
            >
              Entrar
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="text-instagram-blue text-xs cursor-pointer hover:text-white transition-colors"
          >
            Esqueceu a senha?
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.5 }}
            className="w-full flex items-center gap-4"
          >
            <div className="flex-1 h-px bg-instagram-border"></div>
            <span className="text-instagram-text-medium text-xs font-semibold">OU</span>
            <div className="flex-1 h-px bg-instagram-border"></div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.6 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 text-instagram-blue hover:text-white transition-colors text-sm font-semibold"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Entrar com o Facebook
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.7 }}
          className="text-center bg-instagram-card border border-instagram-border rounded-instagram p-5 text-sm"
        >
          <span className="text-instagram-text-light">Não tem uma conta? </span>
          <span className="text-instagram-blue font-semibold cursor-pointer hover:text-white transition-colors">
            Cadastre-se.
          </span>
        </motion.div>
      </motion.div>
    </main>
  );
}
