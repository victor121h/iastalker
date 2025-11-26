'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

interface Story {
  id: number;
  username: string;
  avatar: string;
  isBlurred: boolean;
  isFirst: boolean;
}

interface Message {
  id: number;
  username: string;
  avatar: string;
  message: string;
  time: string;
  isOnline: boolean;
  hasUnread: boolean;
  isBlurred: boolean;
  isPrivate: boolean;
}

function censorName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '*****';
}

function DirectContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || 'ovictortv';
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (username) {
      fetch(`/api/instagram?username=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => setProfile(data))
        .catch(console.error);
    }
  }, [username]);

  const getProxiedAvatar = (url: string) => {
    if (url && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const stories: Story[] = [
    { 
      id: 1, 
      username: 'Conte as novidades', 
      avatar: profile?.avatar ? getProxiedAvatar(profile.avatar) : 'https://i.pravatar.cc/68?img=1', 
      isBlurred: false,
      isFirst: true
    },
    { id: 2, username: 'joana_maria', avatar: 'https://i.pravatar.cc/68?img=5', isBlurred: true, isFirst: false },
    { id: 3, username: 'usuario123', avatar: 'https://i.pravatar.cc/68?img=12', isBlurred: false, isFirst: false },
    { id: 4, username: 'rafael_silva', avatar: 'https://i.pravatar.cc/68?img=9', isBlurred: true, isFirst: false },
    { id: 5, username: 'eduarda_santos', avatar: 'https://i.pravatar.cc/68?img=13', isBlurred: false, isFirst: false },
    { id: 6, username: 'sergio_costa', avatar: 'https://i.pravatar.cc/68?img=20', isBlurred: true, isFirst: false },
    { id: 7, username: 'marina_oliveira', avatar: 'https://i.pravatar.cc/68?img=25', isBlurred: false, isFirst: false },
  ];

  const messages: Message[] = [
    { 
      id: 1, 
      username: 'juliana_ferreira', 
      avatar: 'https://i.pravatar.cc/56?img=32', 
      message: 'eii, tá aí? 🔥', 
      time: '8 h',
      isOnline: true,
      hasUnread: true,
      isBlurred: false,
      isPrivate: false
    },
    { 
      id: 2, 
      username: 'marcos_almeida', 
      avatar: 'https://i.pravatar.cc/56?img=14', 
      message: 'preciso falar contigo parada séria', 
      time: '9 min',
      isOnline: false,
      hasUnread: true,
      isBlurred: true,
      isPrivate: true
    },
    { 
      id: 3, 
      username: 'usuario_teste', 
      avatar: 'https://i.pravatar.cc/56?img=18', 
      message: 'Oi, você já chegou?', 
      time: '59 min',
      isOnline: true,
      hasUnread: false,
      isBlurred: false,
      isPrivate: false
    },
    { 
      id: 4, 
      username: 'felipe_gomes', 
      avatar: 'https://i.pravatar.cc/56?img=22', 
      message: 'Vamos sair amanhã? 🎉', 
      time: '1 h',
      isOnline: false,
      hasUnread: true,
      isBlurred: true,
      isPrivate: true
    },
    { 
      id: 5, 
      username: 'amanda_lima', 
      avatar: 'https://i.pravatar.cc/56?img=28', 
      message: 'Olha isso aqui 👀', 
      time: '42 min',
      isOnline: true,
      hasUnread: false,
      isBlurred: false,
      isPrivate: false
    },
    { 
      id: 6, 
      username: 'pedro_rocha', 
      avatar: 'https://i.pravatar.cc/56?img=33', 
      message: 'Que absurdo mano', 
      time: '2 h',
      isOnline: false,
      hasUnread: false,
      isBlurred: true,
      isPrivate: false
    },
    { 
      id: 7, 
      username: 'camila_santos', 
      avatar: 'https://i.pravatar.cc/56?img=44', 
      message: 'Mandou mensagem pra você', 
      time: '3 h',
      isOnline: true,
      hasUnread: true,
      isBlurred: false,
      isPrivate: true
    },
    { 
      id: 8, 
      username: 'lucas_dias', 
      avatar: 'https://i.pravatar.cc/56?img=51', 
      message: 'Respondeu seu story', 
      time: '5 h',
      isOnline: false,
      hasUnread: false,
      isBlurred: false,
      isPrivate: false
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="sticky top-0 z-50 bg-[#0A0C0D] border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <div className="flex items-center gap-1">
            <img 
              src="/logo-insta.png" 
              alt="Instagram" 
              className="h-[29px] w-auto"
            />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="mt-0.5">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          <div className="flex items-center gap-6">
            <button className="p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <button className="p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Pergunte à Meta AI ou pesquise"
            className="w-full bg-[#1A1D20] text-white placeholder-[#A8A8A8] rounded-xl py-2.5 pl-11 pr-4 text-[15px] outline-none border-none"
          />
        </div>
      </div>

      <div className="border-b border-[rgba(255,255,255,0.08)] py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className="relative">
                <div 
                  className="p-[2px] rounded-full"
                  style={{
                    background: story.isFirst 
                      ? 'transparent'
                      : 'linear-gradient(135deg, #D62976, #FA7E1E, #FEDA75, #962FBF, #4F5BD5)'
                  }}
                >
                  <div className={`bg-[#000] rounded-full ${story.isFirst ? 'p-0' : 'p-[2px]'}`}>
                    <div className="relative">
                      <img
                        src={story.avatar}
                        alt={story.username}
                        className={`w-[56px] h-[56px] rounded-full object-cover ${story.isBlurred ? 'blur-[6px]' : ''}`}
                      />
                      {story.isFirst && (
                        <div className="absolute bottom-0 right-0 w-[20px] h-[20px] bg-[#1A73E8] rounded-full flex items-center justify-center border-2 border-black">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M12 5v14M5 12h14" strokeWidth="3" stroke="white" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#A8A8A8] max-w-[64px] truncate text-center">
                {story.isFirst ? story.username : censorName(story.username)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-[15px] font-semibold">Mensagens</span>
          <span className="text-[#1A73E8] text-[14px]">Pedidos (1)</span>
        </div>
      </div>

      <div className="overflow-y-auto pb-20">
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-center px-4 py-2 hover:bg-[#0C0C0C] transition-colors cursor-pointer"
          >
            <div className="relative mr-3">
              <div className="relative">
                <img
                  src={msg.avatar}
                  alt={msg.username}
                  className={`w-[56px] h-[56px] rounded-full object-cover ${msg.isBlurred ? 'blur-[6px]' : ''}`}
                />
                {msg.isPrivate && !msg.isBlurred && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                    </svg>
                  </div>
                )}
              </div>
              {msg.isOnline && (
                <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#19C463] rounded-full border-2 border-black"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-white text-[14px] font-normal">{censorName(msg.username)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#A8A8A8] text-[13px] truncate">{msg.message}</span>
                <span className="text-[#A8A8A8] text-[13px] flex-shrink-0"> · {msg.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-2">
              {msg.hasUnread && (
                <div className="w-[8px] h-[8px] bg-[#1A73E8] rounded-full"></div>
              )}
              <button className="p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A5A5A6" strokeWidth="1.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 h-[50px] bg-[#000] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-around px-2">
        <button className="p-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="p-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="p-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
        <button className="p-3 relative">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M22 3l-1.67 1.67C18.09 3.26 15.66 2 13 2 7.48 2 3 6.48 3 12s4.48 10 10 10c4.76 0 8.72-3.33 9.73-7.77H20.1c-.95 3.12-3.86 5.42-7.36 5.42-4.24 0-7.68-3.44-7.68-7.68 0-4.24 3.44-7.68 7.68-7.68 2.12 0 4.04.86 5.43 2.25L15 9.5h7V3z"/>
          </svg>
          <span className="absolute -top-0.5 -right-0.5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            9+
          </span>
        </button>
        <button className="p-3">
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

export default function DirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000]" />}>
      <DirectContent />
    </Suspense>
  );
}
