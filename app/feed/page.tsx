'use client';

import { Suspense, useEffect, useState, memo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';
import { saveProfileCache, getProfileCache } from '@/lib/profileCache';

function ImageWithFallback({ src, alt, className, fallbackClassName }: { src: string; alt: string; className: string; fallbackClassName?: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return <div className={fallbackClassName || className} style={{ backgroundColor: '#262626' }} />;
  }

  return (
    <div className="relative">
      {!isLoaded && (
        <div className={`absolute inset-0 ${fallbackClassName || className} animate-pulse`} style={{ backgroundColor: '#262626' }} />
      )}
      <img
        src={src}
        alt={alt}
        className={className}
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
  isLocked: boolean;
  isCloseFriend?: boolean;
}

const LOCK_AVATAR = '/attached_assets/chat2_1764243660020.png';

const FAKE_USERNAMES = [
  'user_private1', 'hidden_acc', 'secret_profile', 'locked_user', 
  'private_insta', 'no_access', 'hidden_story', 'locked_dm',
  'private_acc', 'secret_user', 'hidden_insta', 'locked_profile',
  'private_stories', 'secret_acc', 'hidden_user', 'locked_acc',
  'private_dm', 'secret_story'
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
  onClick,
  getProxiedAvatar 
}: { 
  story: Story; 
  onClick: () => void;
  getProxiedAvatar: (url: string) => string;
}) {
  const getStoryGradient = () => {
    if (story.isCloseFriend) {
      return '#00D26A';
    }
    if (story.isLocked) {
      return 'linear-gradient(45deg, #962FBF, #D62976, #FA7E1E, #FEDA75)';
    }
    return 'linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)';
  };

  return (
    <div
      className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative">
        <div 
          className="p-[2px] rounded-full"
          style={{ background: getStoryGradient() }}
        >
          <div className="bg-[#000] rounded-full p-[2px]">
            <ImageWithFallback
              src={story.avatar ? getProxiedAvatar(story.avatar) : ''}
              alt={story.username}
              className={`w-[56px] h-[56px] rounded-full object-cover${story.isCloseFriend ? ' blur-md' : ''}`}
            />
          </div>
        </div>
        {story.isLocked && (
          <div className="absolute inset-[2px] bg-black/70 rounded-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"></path></svg>
          </div>
        )}
        {story.isCloseFriend && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#00D26A] flex items-center justify-center border-2 border-black">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
        )}
      </div>
      <span className="text-[11px] text-white max-w-[60px] truncate text-center">
        {story.username}
      </span>
    </div>
  );
});

const blurredComments = [
  "What a beautiful photo! 😍",
  "You killed it!",
  "Perfect 🔥",
  "I miss you...",
  "I love you ❤️",
  "Wonderful!",
  "What an amazing place!",
  "Beautiful 💕",
];

const PostItem = memo(function PostItem({
  post,
  postUser,
  maskedUsername,
  location,
  showNotification,
  getProxiedAvatar,
  targetUsername
}: {
  post: { id: number; likes: number; comments: number; shares: number; date: string; time: string };
  postUser: FollowingUser | null;
  maskedUsername: string;
  location: string;
  showNotification: () => void;
  getProxiedAvatar: (url: string) => string;
  targetUsername: string;
}) {
  const postAvatar = postUser?.avatar ? getProxiedAvatar(postUser.avatar) : '';
  const postUsername = postUser ? censorName(postUser.username) : maskedUsername;

  return (
    <article className="bg-[#000] border-b border-[#262626]">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center overflow-hidden">
              <ImageWithFallback
                src={postAvatar}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-white text-[13px] font-semibold">{postUsername}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#3897F0" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path></svg>
            </div>
            <span className="text-[#A0A0A0] text-[11px]">{location}</span>
          </div>
        </div>
        <button className="p-2" onClick={showNotification}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
        </button>
      </div>

      <div className="bg-[#000] aspect-square flex flex-col items-center justify-center cursor-pointer" onClick={showNotification}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-full bg-[#363636] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white" className="opacity-90" xmlns="http://www.w3.org/2000/svg"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></svg>
          </div>
          <div className="text-center">
            <p className="text-white text-[16px] font-bold mb-1.5">Restricted Content</p>
            <p className="text-[#8E8E8E] text-[13px]">This post contains private content. Unlock to view.</p>
          </div>
          <span className="text-[#E53935] text-[11px] font-medium tracking-wider uppercase">{post.date} • {post.time}</span>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={showNotification}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            </button>
            <button onClick={showNotification}>
              <img src="/icons/imgi_21_comentario.png" alt="" width="24" height="24" className="invert-0" />
            </button>
            <button onClick={showNotification}>
              <img src="/icons/imgi_22_repost.png" alt="" width="24" height="24" />
            </button>
            <button onClick={showNotification}>
              <img src="/icons/enviar.png" alt="" width="24" height="24" />
            </button>
          </div>
          <button onClick={showNotification}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
          </button>
        </div>

        <div className="text-white text-[13px] font-semibold mb-2">
          {post.likes} likes
        </div>
        
        <div className="space-y-1.5 mb-2">
          <div className="flex items-center gap-2 cursor-pointer" onClick={showNotification}>
            <span className="text-white text-[13px] font-semibold">{targetUsername}</span>
            <span 
              className="text-[#A8A8A8] text-[13px]"
              style={{ filter: 'blur(4px)', userSelect: 'none' }}
            >
              {blurredComments[post.id % blurredComments.length]}
            </span>
          </div>
          {post.comments > 1 && (
            <button 
              className="text-[#A8A8A8] text-[13px]"
              onClick={showNotification}
            >
              View all {post.comments} comments
            </button>
          )}
        </div>

        <div className="text-[#A0A0A0] text-[11px] uppercase tracking-wide">
          {post.date}
        </div>
      </div>
    </article>
  );
});

const BottomNav = memo(function BottomNav({ 
  profileAvatar, 
  showNotification,
  getProxiedAvatar
}: { 
  profileAvatar: string | undefined; 
  showNotification: () => void;
  getProxiedAvatar: (url: string) => string;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[50px] bg-[#000] border-t border-[#262626] flex items-center justify-around px-2">
      <button className="p-3" onClick={showNotification}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V10.5z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
      </button>
      <button className="p-3" onClick={showNotification}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" strokeLinecap="round" strokeLinejoin="round"></rect><path d="M9.5 8l5 4-5 4V8z" fill="white" stroke="white" strokeLinecap="round" strokeLinejoin="round"></path></svg>
      </button>
      <a href="/direct" className="p-3 relative">
        <img src="/icons/enviar.png" alt="DM" width="26" height="26" style={{ filter: 'brightness(0) invert(1)' }} />
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">18</span>
      </a>
      <button className="p-3" onClick={showNotification}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35" strokeLinecap="round"></path></svg>
      </button>
      <button className="p-3" onClick={showNotification}>
        <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
          <ImageWithFallback
            src={profileAvatar ? getProxiedAvatar(profileAvatar) : ''}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </button>
    </nav>
  );
});

function FeedSkeleton() {
  return (
    <div className="min-h-screen bg-[#000] pt-[48px]">
      <header className="sticky top-[48px] z-50 bg-[#000] border-b border-[#262626]">
        <div className="flex items-center justify-between px-4 h-[44px]">
          <div className="h-8 w-24 bg-[#262626] rounded animate-pulse" />
          <div className="flex gap-4">
            <div className="h-6 w-6 bg-[#262626] rounded animate-pulse" />
            <div className="h-6 w-6 bg-[#262626] rounded animate-pulse" />
          </div>
        </div>
      </header>
      <div className="py-3 px-4 flex gap-4 overflow-hidden border-b border-[#262626]">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-[60px] h-[60px] rounded-full bg-[#262626] animate-pulse" />
            <div className="w-10 h-2 bg-[#262626] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="pb-16">
        {[1,2].map(i => (
          <div key={i} className="border-b border-[#262626]">
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-[#262626] animate-pulse" />
              <div className="flex flex-col gap-1">
                <div className="w-20 h-3 bg-[#262626] rounded animate-pulse" />
                <div className="w-14 h-2 bg-[#262626] rounded animate-pulse" />
              </div>
            </div>
            <div className="aspect-square bg-[#0C1011] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = searchParams.get('username') || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [location, setLocation] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification, barHeight } = useNotification();
  const [igNotifications, setIgNotifications] = useState<{ id: number; username: string; avatar: string; visible: boolean }[]>([]);
  const followingRef = useRef<FollowingUser[]>([]);

  useEffect(() => {
    followingRef.current = following;
  }, [following]);

  useEffect(() => {
    const fallbackNames = ['s*****', 'i*****', 'm*****', 'l*****', 'r*****', 'a*****', 'j*****', 'c*****'];
    let count = 0;

    const getNotifData = () => {
      const users = followingRef.current;
      if (users.length > 0) {
        const user = users[count % users.length];
        return { username: censorName(user.username), avatar: user.avatar || '' };
      }
      return { username: fallbackNames[count % fallbackNames.length], avatar: '' };
    };

    const firstDelay = setTimeout(() => {
      const data = getNotifData();
      setIgNotifications(prev => [...prev, { id: count, username: data.username, avatar: data.avatar, visible: true }]);
      const dismissId = count;
      setTimeout(() => setIgNotifications(prev => prev.filter(n => n.id !== dismissId)), 4500);
      count++;
    }, 3000);

    const interval = setInterval(() => {
      const data = getNotifData();
      setIgNotifications(prev => [...prev, { id: count, username: data.username, avatar: data.avatar, visible: true }]);
      const dismissId = count;
      setTimeout(() => setIgNotifications(prev => prev.filter(n => n.id !== dismissId)), 4500);
      count++;
    }, 12000);

    return () => { clearTimeout(firstDelay); clearInterval(interval); };
  }, []);

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
        setLocation(cached.location || 'Hidden location');
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
    }
    
    Promise.all([
      fetch('/api/geolocation', { signal: controller.signal })
        .then(res => res.json())
        .catch(() => ({ location: 'Hidden location' })),
      username ? fetch(`/api/instagram?username=${encodeURIComponent(username)}`, { signal: controller.signal })
        .then(res => res.json())
        .catch(() => null) : Promise.resolve(null)
    ]).then(([geoData, profileData]) => {
      const locationValue = geoData.location || 'Hidden location';
      setLocation(locationValue);
      if (profileData) {
        setProfile(profileData);
        if (profileData.pk) {
          fetch(`/api/instagram/following?userId=${encodeURIComponent(profileData.pk)}`, { signal: controller.signal })
            .then(res => res.json())
            .then(followData => {
              if (followData.following?.length > 0) {
                setFollowing(followData.following);
                saveProfileCache({
                  username,
                  profile: profileData,
                  following: followData.following,
                  location: locationValue
                });
              } else {
                const fakeFollowing = generateFakeFollowing();
                setFollowing(fakeFollowing);
                saveProfileCache({
                  username,
                  profile: profileData,
                  following: fakeFollowing.map(f => ({ pk: f.pk, username: f.username, full_name: f.fullName, avatar: f.avatar })),
                  location: locationValue
                });
              }
            })
            .catch(() => {
              const fakeFollowing = generateFakeFollowing();
              setFollowing(fakeFollowing);
              saveProfileCache({
                username,
                profile: profileData,
                following: fakeFollowing.map(f => ({ pk: f.pk, username: f.username, full_name: f.fullName, avatar: f.avatar })),
                location: locationValue
              });
            });
        } else {
          saveProfileCache({
            username,
            profile: profileData,
            following: [],
            location: locationValue
          });
        }
      }
      setIsLoading(false);
    });

    return () => controller.abort();
  }, [username]);

  const maskedUsername = username ? 
    username.charAt(0) + '*'.repeat(Math.min(username.length - 1, 5)) : 
    'p*****';

  const closeFriendIndexes = [1, 4, 6];
  
  const stories: Story[] = [
    { 
      id: 0, 
      username: 'Your story', 
      avatar: profile?.avatar || '', 
      isLocked: false 
    },
    ...following.slice(0, 17).map((user, index) => ({
      id: index + 1,
      username: censorName(user.username),
      avatar: user.avatar || '',
      isLocked: true,
      isCloseFriend: closeFriendIndexes.includes(index)
    }))
  ];

  const posts = [
    { id: 1, likes: 12, comments: 5, shares: 3, date: 'November 24', time: '22:47', userIndex: 0 },
    { id: 2, likes: 47, comments: 12, shares: 8, date: 'November 23', time: '18:32', userIndex: 1 },
    { id: 3, likes: 89, comments: 23, shares: 15, date: 'November 22', time: '14:15', userIndex: 2 },
    { id: 4, likes: 156, comments: 34, shares: 21, date: 'November 21', time: '09:28', userIndex: 3 },
  ];

  if (isLoading) {
    return <FeedSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#000]" style={{ paddingTop: barHeight }}>
      <header className="sticky z-50 bg-[#000] border-b border-[#262626]" style={{ top: barHeight }}>
        <div className="flex items-center justify-between px-4 h-[44px] relative">
          <button className="p-1" onClick={showNotification}>
            <img src="/icons/imgi_3_adicionar_conteudo.png" alt="" width="24" height="24" />
          </button>
          <img src="/logo-instagram.png" alt="Instagram" className="h-[29px] w-auto absolute left-1/2 -translate-x-1/2" />
          <div className="flex items-center gap-5">
            <button className="relative" onClick={showNotification}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            </button>
            <button className="relative" onClick={() => router.push(`/direct?${searchParams.toString()}`)}>
              <img src="/icons/enviar.png" alt="" width="24" height="24" />
              <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                18
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-[#000] border-b border-[#262626] py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4">
          {stories.map((story) => (
            <StoryItem
              key={story.id}
              story={story}
              onClick={() => story.isLocked && showNotification()}
              getProxiedAvatar={getProxiedAvatar}
            />
          ))}
        </div>
      </div>

      <div className="pb-16">
        {posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            postUser={following[post.userIndex] || null}
            maskedUsername={maskedUsername}
            location={location}
            showNotification={showNotification}
            getProxiedAvatar={getProxiedAvatar}
            targetUsername={username || maskedUsername}
          />
        ))}
      </div>

      {igNotifications.map(notif => (
        <div
          key={notif.id}
          className="fixed left-4 right-4 z-[200] transition-all duration-500"
          style={{ top: barHeight + 50 }}
        >
          <div className="bg-[#262626] border border-[#363636] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
            <div className="w-9 h-9 rounded-full bg-[#363636] flex-shrink-0 overflow-hidden">
              {notif.avatar ? (
                <img src={getProxiedAvatar(notif.avatar)} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#E53935">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px]">
                <span className="font-semibold">{notif.username}</span> liked your photo
              </p>
              <p className="text-[#8E8E8E] text-[11px]">Just now</p>
            </div>
            <div className="w-10 h-10 rounded bg-[#363636] flex-shrink-0" />
          </div>
        </div>
      ))}

      <BottomNav 
        profileAvatar={profile?.avatar} 
        showNotification={showNotification}
        getProxiedAvatar={getProxiedAvatar}
      />
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent />
    </Suspense>
  );
}
