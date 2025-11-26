'use client';

import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MatrixBackground from '@/components/MatrixBackground';
import InstagramButton from '@/components/InstagramButton';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || 'victortv';

  const mockProfile = {
    username: username,
    name: 'Victor Hugo',
    avatar: 'https://i.pravatar.cc/150?img=33',
    bio: '🔥 | Do Zero ao Milhão em 6 meses com 19 anos. 🔺 | Aposentei meus pais, +10 milhões com produtos feitos por IA. 🔥 | Mentor Links',
    posts: 88,
    followers: 128287,
    following: 241,
  };

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
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="text-3xl font-bold instagram-gradient-text"
          >
            Confirmar Pesquisa
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
            className="text-instagram-text-light text-base"
          >
            Você deseja espionar o perfil{' '}
            <span className="text-white font-bold">@{mockProfile.username}</span>?
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="story-gradient-border"
          >
            <div className="bg-instagram-bg rounded-full p-1">
              <img
                src={mockProfile.avatar}
                alt={mockProfile.name}
                className="w-32 h-32 rounded-full object-cover"
              />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="space-y-2"
          >
            <h2 className="text-white font-bold text-xl">{mockProfile.name}</h2>
            <p className="text-instagram-text-medium text-sm max-w-xs">{mockProfile.bio}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.5 }}
            className="grid grid-cols-3 gap-6 w-full max-w-xs"
          >
            <div className="text-center">
              <div className="text-white font-bold text-lg">{mockProfile.posts}</div>
              <div className="text-instagram-text-medium text-xs">Publicações</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">{mockProfile.followers.toLocaleString()}</div>
              <div className="text-instagram-text-medium text-xs">Seguidores</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">{mockProfile.following}</div>
              <div className="text-instagram-text-medium text-xs">Seguindo</div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.6 }}
            className="w-full bg-instagram-gradient-pink/10 border border-instagram-gradient-pink/30 rounded-2xl p-4"
          >
            <div className="flex items-start gap-3 text-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-instagram-gradient-pink flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-instagram-text-light text-sm">
                Nossa plataforma libera somente uma pesquisa por pessoa, então confirme se realmente deseja espionar.
              </p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.7 }}
            className="flex gap-3 w-full"
          >
            <InstagramButton
              variant="outline"
              onClick={() => router.push('/search')}
              className="flex-1"
            >
              Corrigir @
            </InstagramButton>
            <InstagramButton
              onClick={() => router.push('/login')}
              className="flex-1"
            >
              Confirmar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </InstagramButton>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-instagram-bg" />}>
      <ConfirmContent />
    </Suspense>
  );
}
