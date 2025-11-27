'use client';

import { Suspense, useEffect, useState, memo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';

function ImageWithFallback({ src, alt, className, blurred = false }: { src: string; alt: string; className: string; blurred?: boolean }) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return <div className={`${className} ${blurred ? 'blur-[6px]' : ''}`} style={{ backgroundColor: '#262626' }} />;
  }

  return (
    <div className="relative">
      {!isLoaded && (
        <div className={`absolute inset-0 ${className} animate-pulse ${blurred ? 'blur-[6px]' : ''}`} style={{ backgroundColor: '#262626' }} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${blurred ? 'blur-[6px]' : ''}`}
        loading="eager"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

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
  isBlurred: boolean;
  isFirst: boolean;
  isLocked: boolean;
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

const StoryItem = memo(function StoryItem({
  story,
  profileAvatar,
  onClick,
  getProxiedAvatar
}: {
  story: Story;
  profileAvatar: string;
  onClick: () => void;
  getProxiedAvatar: (url: string) => string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
      onClick={onClick}
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
              <ImageWithFallback
                src={story.isFirst ? profileAvatar : (story.avatar ? getProxiedAvatar(story.avatar) : '')}
                alt={story.username}
                className="w-[56px] h-[56px] rounded-full object-cover"
              />
              {story.isFirst && (
                <div className="absolute bottom-0 right-0 w-[20px] h-[20px] bg-[#1A73E8] rounded-full flex items-center justify-center border-2 border-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M12 5v14M5 12h14" strokeWidth="3" stroke="white" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              {story.isLocked && !story.isFirst && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
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
    </div>
  );
});

const MessageItem = memo(function MessageItem({
  msg,
  onClick,
  getProxiedAvatar
}: {
  msg: Message;
  onClick: () => void;
  getProxiedAvatar: (url: string) => string;
}) {
  return (
    <div
      className="flex items-center px-4 py-2 hover:bg-[#0C0C0C] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="relative mr-3">
        <div className="relative">
          <ImageWithFallback
            src={msg.avatar ? getProxiedAvatar(msg.avatar) : ''}
            alt={msg.username}
            className="w-[56px] h-[56px] rounded-full object-cover"
            blurred={msg.isBlurred}
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
          <span className={`text-white text-[14px] font-normal ${msg.isBlurred ? 'blur-[4px]' : ''}`}>{censorName(msg.username)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[#A8A8A8] text-[13px] truncate ${msg.isBlurred ? 'blur-[4px]' : ''}`}>{msg.message}</span>
          <span className={`text-[#A8A8A8] text-[13px] flex-shrink-0 ${msg.isBlurred ? 'blur-[4px]' : ''}`}> · {msg.time}</span>
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
    </div>
  );
});

function DirectSkeleton() {
  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="sticky top-0 z-50 bg-[#0A0C0D] border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <div className="h-7 w-28 bg-[#262626] rounded animate-pulse" />
          <div className="flex gap-4">
            <div className="h-6 w-6 bg-[#262626] rounded animate-pulse" />
            <div className="h-6 w-6 bg-[#262626] rounded animate-pulse" />
          </div>
        </div>
      </header>
      <div className="px-4 py-3">
        <div className="h-10 bg-[#1A1D20] rounded-xl animate-pulse" />
      </div>
      <div className="py-3 px-4 flex gap-4 overflow-hidden border-b border-[rgba(255,255,255,0.08)]">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-[60px] h-[60px] rounded-full bg-[#262626] animate-pulse" />
            <div className="w-12 h-2 bg-[#262626] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="pb-16">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center px-4 py-2">
            <div className="w-[56px] h-[56px] rounded-full bg-[#262626] animate-pulse mr-3" />
            <div className="flex-1">
              <div className="w-24 h-3 bg-[#262626] rounded animate-pulse mb-2" />
              <div className="w-40 h-2 bg-[#262626] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = searchParams.get('username') || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification } = useNotification();

  const getProxiedAvatar = useCallback((url: string) => {
    if (url && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (username) {
      fetch(`/api/instagram?username=${encodeURIComponent(username)}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          setProfile(data);
          if (data.pk) {
            fetch(`/api/instagram/following?userId=${encodeURIComponent(data.pk)}`, { signal: controller.signal })
              .then(res => res.json())
              .then(followData => {
                if (followData.following?.length > 0) {
                  setFollowing(followData.following);
                }
              })
              .catch(() => {})
              .finally(() => setIsLoading(false));
          } else {
            setIsLoading(false);
          }
        })
        .catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [username]);

  const profileAvatar = profile?.avatar ? getProxiedAvatar(profile.avatar) : '';
  
  const stories: Story[] = [
    { 
      id: 0, 
      username: 'Conte as novidades', 
      avatar: profileAvatar, 
      isBlurred: false,
      isFirst: true,
      isLocked: false
    },
    ...following.slice(0, 10).map((user, index) => ({
      id: index + 1,
      username: user.username,
      avatar: user.avatar || '',
      isBlurred: false,
      isFirst: false,
      isLocked: true
    }))
  ];

  const mockMessages = [
    'eii, tá aí? 🔥',
    'preciso falar contigo parada séria',
    'Oi, você já chegou?',
    'Vamos sair amanhã? 🎉',
    'Olha isso aqui 👀',
    'Que absurdo mano',
    'Mandou mensagem pra você',
    'Respondeu seu story',
  ];

  const mockTimes = ['8 h', '9 min', '59 min', '1 h', '42 min', '2 h', '3 h', '5 h'];

  const chat1Avatar = '/attached_assets/chat2_1764243660020.png';
  const chat2Avatar = '/attached_assets/chat1_1764243704781.png';
  
  const messages: Message[] = following.length > 0 
    ? following.slice(0, 7).map((user, index) => ({
        id: index + 1,
        username: user.username,
        avatar: index === 0 ? chat1Avatar : index === 1 ? chat2Avatar : (user.avatar || ''),
        message: mockMessages[index % mockMessages.length],
        time: mockTimes[index % mockTimes.length],
        isOnline: index % 3 === 0,
        hasUnread: index % 2 === 0,
        isBlurred: index >= 3,
        isPrivate: user.isPrivate
      }))
    : [];

  const handleMessageClick = (index: number) => {
    const params = new URLSearchParams();
    const paramsToCopy = ['username', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    paramsToCopy.forEach(param => {
      const value = searchParams.get(param);
      if (value) params.set(param, value);
    });
    const queryString = params.toString();
    
    if (index === 0) {
      router.push(queryString ? `/chat1?${queryString}` : '/chat1');
    } else if (index === 1) {
      router.push(queryString ? `/chat2?${queryString}` : '/chat2');
    } else if (index === 2) {
      router.push(queryString ? `/chat3?${queryString}` : '/chat3');
    } else {
      showNotification();
    }
  };

  if (isLoading) {
    return <DirectSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="sticky top-0 z-50 bg-[#0A0C0D] border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push(`/feed?${searchParams.toString()}`)}
              className="p-1"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
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
          {stories.map((story) => (
            <StoryItem
              key={story.id}
              story={story}
              profileAvatar={profileAvatar}
              onClick={() => story.isLocked && showNotification()}
              getProxiedAvatar={getProxiedAvatar}
            />
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
          <MessageItem
            key={msg.id}
            msg={msg}
            onClick={() => handleMessageClick(index)}
            getProxiedAvatar={getProxiedAvatar}
          />
        ))}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 h-[50px] bg-[#000] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-around px-2">
        <button className="p-3" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" strokeLinecap="round" strokeLinejoin="round"/>
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
        <button className="p-3 relative" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M22 3l-1.67 1.67C18.09 3.26 15.66 2 13 2 7.48 2 3 6.48 3 12s4.48 10 10 10c4.76 0 8.72-3.33 9.73-7.77H20.1c-.95 3.12-3.86 5.42-7.36 5.42-4.24 0-7.68-3.44-7.68-7.68 0-4.24 3.44-7.68 7.68-7.68 2.12 0 4.04.86 5.43 2.25L15 9.5h7V3z"/>
          </svg>
          <span className="absolute -top-0.5 -right-0.5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            9+
          </span>
        </button>
        <button className="p-3" onClick={showNotification}>
          <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
            <ImageWithFallback
              src={profileAvatar}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </button>
      </nav>
    </div>
  );
}

export default function DirectPage() {
  return (
    <Suspense fallback={<DirectSkeleton />}>
      <DirectContent />
    </Suspense>
  );
}
