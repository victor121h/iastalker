'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import InstagramHeader from '@/components/InstagramHeader';
import StoriesBar from '@/components/StoriesBar';

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
}

function FeedContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (username) {
      fetch(`/api/instagram?username=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => setProfile(data))
        .catch(console.error);
    }
  }, [username]);

  const maskedUsername = username ? 
    username.charAt(0) + '*'.repeat(Math.min(username.length - 1, 5)) : 
    '********';

  return (
    <div className="min-h-screen bg-instagram-bg">
      <InstagramHeader />
      <StoriesBar targetUsername={username} targetAvatar={profile?.avatar} />
      
      <main className="max-w-2xl mx-auto pt-8 px-4 pb-20">
        {profile?.isPrivate ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="text-center py-12"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full border-2 border-instagram-border flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-bold">Esta conta é privada</h2>
              <p className="text-instagram-text-medium text-sm max-w-xs mx-auto">
                Siga @{maskedUsername} para ver as fotos e vídeos.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="text-center py-12"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full border-2 border-instagram-border flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-bold">Nenhuma publicação ainda</h2>
              <p className="text-instagram-text-medium text-sm">
                Quando @{maskedUsername} publicar, você verá as fotos e vídeos aqui.
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
          className="mt-8 bg-instagram-card border border-instagram-border rounded-instagram p-6"
        >
          <div className="flex items-start gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-instagram-gradient-pink flex-shrink-0">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" fill="currentColor" />
            </svg>
            <div>
              <h3 className="text-white font-bold text-sm mb-1">Local oculto</h3>
              <p className="text-instagram-text-medium text-xs">
                {maskedUsername} está com a localização desativada
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-12 bg-instagram-bg border-t border-instagram-border flex items-center justify-around">
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button className="hover:opacity-70 transition-opacity">
          <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-instagram-border" />
            )}
          </div>
        </button>
      </nav>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-instagram-bg" />}>
      <FeedContent />
    </Suspense>
  );
}
