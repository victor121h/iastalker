'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DeepGramLogo from '@/components/DeepGramLogo';
import InstagramButton from '@/components/InstagramButton';
import MatrixBackground from '@/components/MatrixBackground';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <MatrixBackground />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 bg-instagram-card border border-instagram-border rounded-instagram p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <DeepGramLogo />
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-white leading-tight"
          >
            O que realmente ele(a) faz quando tá no Insta?
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-instagram-text-light text-base md:text-lg"
          >
            Descubra a verdade sobre qualquer pessoa do Instagram. Só com o @.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="w-full"
          >
            <InstagramButton 
              onClick={() => router.push('/search')}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 5v.01M12 18.99v.01M5 12h.01M18.99 12h.01" />
                </svg>
              }
            >
              Espionar Agora
            </InstagramButton>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="flex items-center gap-2 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-instagram-gradient-pink">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" fill="currentColor" />
              <circle cx="12" cy="10" r="3" fill="white" />
            </svg>
            <span className="text-instagram-text-medium">
              100% Anônimo. A pessoa <span className="instagram-gradient-text font-bold">NUNCA</span> saberá.
            </span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
