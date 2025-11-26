'use client';

import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import MatrixBackground from '@/components/MatrixBackground';
import InstagramButton from '@/components/InstagramButton';

interface ProfileData {
  username: string;
  name: string;
  avatar: string;
  bio: string;
  posts: number;
  followers: number;
  following: number;
  isPrivate: boolean;
  isVerified: boolean;
  externalUrl: string;
  pk: string;
}

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || '';
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      router.push('/search');
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/instagram?username=${encodeURIComponent(username)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch profile');
        }
        
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, router]);

  if (loading) {
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-instagram-gradient-pink"></div>
            <p className="text-instagram-text-light">Buscando perfil @{username}...</p>
          </div>
        </motion.div>
      </main>
    );
  }

  if (error || !profile) {
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
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f56040" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Perfil não encontrado</h2>
            <p className="text-instagram-text-medium text-sm">
              {error || `Não foi possível encontrar o perfil @${username}`}
            </p>
            <InstagramButton onClick={() => router.push('/search')}>
              Tentar novamente
            </InstagramButton>
          </div>
        </motion.div>
      </main>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return num.toLocaleString('pt-BR');
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
            <span className="text-white font-bold">@{profile.username}</span>?
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
            className="story-gradient-border"
          >
            <div className="bg-instagram-bg rounded-full p-1">
              {profile.avatar ? (
                <img
                  src={`/api/proxy-image?url=${encodeURIComponent(profile.avatar)}`}
                  alt={profile.name}
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-instagram-border flex items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                </div>
              )}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-white font-bold text-xl">{profile.name}</h2>
              {profile.isVerified && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0095f6">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
              {profile.isPrivate && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                </svg>
              )}
            </div>
            {profile.bio && (
              <p className="text-instagram-text-medium text-sm max-w-xs">{profile.bio}</p>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.5 }}
            className="grid grid-cols-3 gap-6 w-full max-w-xs"
          >
            <div className="text-center">
              <div className="text-white font-bold text-lg">{formatNumber(profile.posts)}</div>
              <div className="text-instagram-text-medium text-xs">Publicações</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">{formatNumber(profile.followers)}</div>
              <div className="text-instagram-text-medium text-xs">Seguidores</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">{formatNumber(profile.following)}</div>
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
              onClick={() => router.push(`/login?username=${encodeURIComponent(profile.username)}`)}
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
