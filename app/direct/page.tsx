'use client';

import { Suspense, useEffect, useState, memo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';
import { getProfileCache } from '@/lib/profileCache';

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

const LOCK_AVATAR = '/attached_assets/chat2_1764243660020.png';

const FAKE_USERNAMES = [
  'user_private1', 'hidden_acc', 'secret_profile', 'locked_user', 
  'private_insta', 'no_access', 'hidden_story', 'locked_dm',
  'private_acc', 'secret_user', 'hidden_insta', 'locked_profile'
];

function generateFakeFollowing(): FollowingUser[] {
  return FAKE_USERNAMES.map((username, index) => ({
    pk: `fake_${index}`,
    username: username,
    fullName: '',
    avatar: LOCK_AVATAR,
    isPrivate: true,
    isVerified: false
  }));
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
        <ImageWithFallback
          src={story.isFirst ? profileAvatar : (story.avatar ? getProxiedAvatar(story.avatar) : '')}
          alt={story.username}
          className={`w-[72px] h-[72px] rounded-full object-cover${!story.isFirst ? ' blur-[6px]' : ''}`}
        />
        {story.isFirst && (
          <div className="absolute bottom-0 right-0 w-[20px] h-[20px] bg-[#1A73E8] rounded-full flex items-center justify-center border-2 border-black">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 5v14M5 12h14" strokeWidth="3" stroke="white" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        {!story.isFirst && (
          <div className="absolute bottom-0 right-0 w-[16px] h-[16px] bg-[#19C463] rounded-full border-2 border-black"></div>
        )}
        {story.isLocked && !story.isFirst && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"></path></svg>
          </div>
        )}
      </div>
      <span className="text-[12px] text-white max-w-[80px] truncate text-center">
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
            blurred={true}
          />
          {msg.isPrivate && !msg.isBlurred && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"></path></svg>
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
          <img src="/icons/imgi_14_camera-outline.png" alt="" width="24" height="24" />
        </button>
      </div>
    </div>
  );
});

function DirectSkeleton() {
  return (
    <div className="min-h-screen bg-[#000000] pt-[48px]">
      <header className="sticky top-[48px] z-50 bg-[#0A0C0D] border-b border-[rgba(255,255,255,0.08)]">
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
  const [showLoadMorePopup, setShowLoadMorePopup] = useState(false);
  const { showNotification, barHeight } = useNotification();

  const getProxiedAvatar = useCallback((url: string) => {
    if (url && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (username) {
      const cached = getProfileCache(username);
      if (cached) {
        if (cached.profile) {
          setProfile(cached.profile as ProfileData);
        }
        if (cached.following?.length > 0) {
          const mappedFollowing = cached.following.map(f => ({
            pk: f.pk,
            username: f.username,
            fullName: f.full_name || '',
            avatar: f.avatar,
            isPrivate: false,
            isVerified: false
          }));
          setFollowing(mappedFollowing);
        } else {
          setFollowing(generateFakeFollowing());
        }
        setIsLoading(false);
        return;
      }

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
                } else {
                  setFollowing(generateFakeFollowing());
                }
              })
              .catch(() => {
                setFollowing(generateFakeFollowing());
              })
              .finally(() => setIsLoading(false));
          } else {
            setFollowing(generateFakeFollowing());
            setIsLoading(false);
          }
        })
        .catch(() => {
          setFollowing(generateFakeFollowing());
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [username]);

  const profileAvatar = profile?.avatar ? getProxiedAvatar(profile.avatar) : '';
  
  const stories: Story[] = [
    { 
      id: 0, 
      username: 'Compartilhar...', 
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
    'Hey gorgeous, guess what you forgot here? haha',
    'Reacted with 👍 to your message.',
    '4 new messages',
    'Mito, adivinha o que está fazendo de...',
    'Eu compartilhei um video de uma...',
    'Mito, precisamos sair mais...',
    'Te enviei uma mensagem',
    'Respondeu ao seu story',
  ];

  const mockTimes = ['8 h', '10 h', '22 h', 'agora', '30 min', '2h', '3h', '5h'];

  const messages: Message[] = following.length > 0 
    ? following.slice(0, 7).map((user, index) => ({
        id: index + 1,
        username: user.username,
        avatar: user.avatar || '',
        message: mockMessages[index % mockMessages.length],
        time: mockTimes[index % mockTimes.length],
        isOnline: index % 3 === 0,
        hasUnread: index < 3,
        isBlurred: index >= 3,
        isPrivate: index < 3
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
    <div className="min-h-screen bg-[#000000]" style={{ paddingTop: barHeight }}>
      <header className="sticky z-50 bg-[#0A0C0D] border-b border-[rgba(255,255,255,0.08)]" style={{ top: barHeight }}>
        <div className="flex items-center justify-between px-4 h-[52px]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push(`/feed?${searchParams.toString()}`)}
              className="p-1"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" xmlns="http://www.w3.org/2000/svg"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"></path></svg>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35" strokeLinecap="round"></path></svg>
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
        
        <button 
          onClick={() => setShowLoadMorePopup(true)}
          className="w-full py-3 text-[#1A73E8] text-[14px] font-medium hover:bg-[#0C0C0C] transition-colors"
        >
          Carregar mais mensagens
        </button>
      </div>

      {showLoadMorePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#E53935] rounded-xl p-4 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowLoadMorePopup(false)}
              className="absolute top-3 right-3 text-white/80 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
            
            <h2 className="text-white font-bold text-base mb-1 pr-6">
              Your current access only allows content viewing.
            </h2>
            
            <p className="text-white/90 text-sm mb-3">
              To interact and view content fully, get the AI Observer tool.
            </p>
            
            <button 
              onClick={() => {
                const params = new URLSearchParams();
                const paramsToCopy = ['username', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
                paramsToCopy.forEach(param => {
                  const value = searchParams.get(param);
                  if (value) params.set(param, value);
                });
                router.push(`/pitch?${params.toString()}`);
              }}
              className="w-full py-2.5 rounded-lg bg-black text-white font-semibold text-sm hover:bg-black/80 transition-colors"
            >
              I have now unlocked full access
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 h-[50px] bg-[#000] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-around px-2">
        <button className="p-3" onClick={() => router.push(`/feed?${searchParams.toString()}`)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V10.5z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
        </button>
        <button className="p-3" onClick={showNotification}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" strokeLinecap="round" strokeLinejoin="round"></rect><path d="M9.5 8l5 4-5 4V8z" fill="white" stroke="white" strokeLinecap="round" strokeLinejoin="round"></path></svg>
        </button>
        <button className="p-3 relative">
          <img src="/icons/enviar.png" alt="" width="24" height="24" />
          <span className="absolute -top-0.5 -right-0.5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            18
          </span>
        </button>
        <button className="p-3" onClick={showNotification}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35" strokeLinecap="round"></path></svg>
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
