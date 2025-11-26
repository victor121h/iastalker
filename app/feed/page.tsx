'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';

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
  pk: string;
}

interface FollowingUser {
  pk: string;
  username: string;
  fullName: string;
  avatar: string;
  isPrivate: boolean;
  isVerified: boolean;
}

interface Story {
  id: number;
  username: string;
  avatar: string;
  isLocked: boolean;
}

function censorName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '*****';
}

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = searchParams.get('username') || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [location, setLocation] = useState<string>('Carregando...');
  const { showNotification } = useNotification();

  useEffect(() => {
    fetch('/api/geolocation')
      .then(res => res.json())
      .then(data => {
        if (data.location) {
          setLocation(data.location);
        } else {
          setLocation('Local oculto');
        }
      })
      .catch(() => setLocation('Local oculto'));
  }, []);

  useEffect(() => {
    if (username) {
      fetch(`/api/instagram?username=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => {
          setProfile(data);
          if (data.pk) {
            fetch(`/api/instagram/following?userId=${encodeURIComponent(data.pk)}`)
              .then(res => res.json())
              .then(followData => {
                if (followData.following && followData.following.length > 0) {
                  setFollowing(followData.following);
                }
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    }
  }, [username]);

  const getProxiedAvatar = (url: string) => {
    if (url && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const maskedUsername = username ? 
    username.charAt(0) + '*'.repeat(Math.min(username.length - 1, 5)) : 
    'p*****';

  const stories: Story[] = [
    { 
      id: 0, 
      username: 'Seu story', 
      avatar: profile?.avatar ? getProxiedAvatar(profile.avatar) : 'https://i.pravatar.cc/68?img=1', 
      isLocked: false 
    },
    ...following.slice(0, 10).map((user, index) => ({
      id: index + 1,
      username: censorName(user.username),
      avatar: user.avatar ? getProxiedAvatar(user.avatar) : `https://i.pravatar.cc/68?img=${index + 5}`,
      isLocked: true
    }))
  ];

  return (
    <div className="min-h-screen bg-[#000]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#000] border-b border-[#262626]">
        <div className="flex items-center justify-between px-4 h-[44px]">
          <div className="flex items-center gap-2">
            <button className="p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="text-white text-2xl font-serif italic tracking-tight">Instagram</h1>
          </div>
          <div className="flex items-center gap-5">
            <button className="relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white"/>
              </svg>
            </button>
            <button className="relative" onClick={() => router.push('/direct')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                18
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Stories */}
      <div className="bg-[#000] border-b border-[#262626] py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
              onClick={() => story.isLocked && showNotification()}
            >
              <div className="relative">
                <div 
                  className="p-[2px] rounded-full"
                  style={{
                    background: story.isLocked 
                      ? 'linear-gradient(45deg, #962FBF, #D62976, #FA7E1E, #FEDA75)'
                      : 'linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)'
                  }}
                >
                  <div className="bg-[#000] rounded-full p-[2px]">
                    <img
                      src={story.avatar}
                      alt={story.username}
                      className="w-[56px] h-[56px] rounded-full object-cover"
                    />
                  </div>
                </div>
                {story.isLocked && (
                  <div className="absolute inset-[2px] bg-black/70 rounded-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                    </svg>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-white max-w-[60px] truncate text-center">
                {story.username}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Post */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="bg-[#000]"
      >
        {/* Post Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center overflow-hidden">
                {following.length > 0 && following[0]?.avatar ? (
                  <img 
                    src={getProxiedAvatar(following[0].avatar)} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#666">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                  </svg>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[13px] font-semibold">{following.length > 0 ? censorName(following[0].username) : maskedUsername}</span>
              <span className="text-[#A0A0A0] text-[11px]">{location}</span>
            </div>
          </div>
          <button className="p-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>

        {/* Post Content - Restricted */}
        <div className="bg-[#0C1011] aspect-square flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col items-center gap-3"
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#666" className="opacity-80">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
            </svg>
            <span className="text-[#B0B0B0] text-[15px]">Conteúdo restrito</span>
            <span className="text-[#666] text-[12px]">24/11/2024 - 22:47</span>
          </motion.div>
        </div>

        {/* Post Actions */}
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1" onClick={showNotification}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF3B30">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
              <button className="flex items-center gap-1.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-white text-[13px]">5</span>
              </button>
              <button className="flex items-center gap-1.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M17 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 23l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-white text-[13px]">3</span>
              </button>
              <button>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <button>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="text-white text-[13px] font-semibold mb-1">
            12 curtidas
          </div>
          <div className="text-[#A0A0A0] text-[11px]">
            24 de novembro
          </div>
        </div>
      </motion.article>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-[50px] bg-[#000] border-t border-[#262626] flex items-center justify-around px-2">
        <button className="p-3" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z"/>
          </svg>
        </button>
        <button className="p-3" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="p-3" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
        <button className="p-3" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <polygon points="5 3 19 12 5 21 5 3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="p-3" onClick={showNotification}>
          <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
            {profile?.avatar ? (
              <img 
                src={getProxiedAvatar(profile.avatar)} 
                alt="" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-[#262626]" />
            )}
          </div>
        </button>
      </nav>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000]" />}>
      <FeedContent />
    </Suspense>
  );
}
