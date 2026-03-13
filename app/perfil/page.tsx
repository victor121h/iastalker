'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';
import { saveProfileCache, getProfileCache } from '@/lib/profileCache';

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

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#000] pt-[48px]">
      <header className="sticky top-[48px] z-50 bg-[#000] border-b border-[#262626]">
        <div className="flex items-center justify-center px-4 h-[44px]">
          <div className="h-5 w-32 bg-[#262626] rounded animate-pulse" />
        </div>
      </header>
      <div className="px-4 py-4">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#262626] animate-pulse" />
          <div className="flex-1 flex justify-around">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-8 h-4 bg-[#262626] rounded animate-pulse" />
                <div className="w-14 h-3 bg-[#262626] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="w-20 h-3 bg-[#262626] rounded animate-pulse" />
          <div className="w-48 h-3 bg-[#262626] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function PerfilContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = searchParams.get('username') || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'tagged'>('grid');
  const { showNotification, barHeight } = useNotification();

  const getProxiedAvatar = useCallback((url: string) => {
    if (url && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setFollowing([]);

    if (username) {
      const cached = getProfileCache(username);
      if (cached && cached.profile) {
        const cp = cached.profile;
        setProfile({
          username: cp.username || username,
          name: cp.full_name || username,
          avatar: cp.avatar || '',
          bio: cp.biography || '',
          posts: cp.media_count || 0,
          followers: cp.follower_count || 0,
          following: cp.following_count || 0,
          isPrivate: cp.is_private || false,
          isVerified: false,
          pk: cp.pk || '',
        });
        if (cached.following?.length > 0) {
          setFollowing(cached.following.map(f => ({
            pk: f.pk, username: f.username, fullName: f.full_name || '', avatar: f.avatar, isPrivate: false, isVerified: false
          })));
        }
        setIsLoading(false);
        return;
      }

      fetch(`/api/instagram?username=${encodeURIComponent(username)}`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch profile');
          return res.json();
        })
        .then(data => {
          if (data.error) throw new Error(data.error);
          setProfile(data);
          saveProfileCache({ username, profile: data, following: [], location: '' });
          if (data.pk) {
            fetch(`/api/instagram/following?userId=${encodeURIComponent(data.pk)}`, { signal: controller.signal })
              .then(res => res.json())
              .then(followData => {
                const followList = followData.following || [];
                if (followList.length > 0) {
                  setFollowing(followList);
                  saveProfileCache({ username, profile: data, following: followList, location: '' });
                }
              })
              .catch(() => {});
          }
          setIsLoading(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Profile fetch error:', err);
          }
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [username]);

  const fakePosts = Array.from({ length: 9 }, (_, i) => ({
    id: i,
    views: [699, 9, 9, 19, 20, 13, 45, 8, 32][i] || Math.floor(Math.random() * 50),
    isReel: [false, true, false, false, false, false, true, false, true][i],
  }));

  if (isLoading) return <ProfileSkeleton />;

  const displayName = profile?.name || username;
  const avatarUrl = profile?.avatar ? getProxiedAvatar(profile.avatar) : '';
  const storyUsers = following.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#000]" style={{ paddingTop: barHeight }}>
      <header className="sticky z-50 bg-[#000] border-b border-[#262626]" style={{ top: barHeight }}>
        <div className="flex items-center justify-between px-4 h-[44px]">
          <button onClick={showNotification} className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-[16px]">{profile?.username || username}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="mt-0.5">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
            <div className="w-2 h-2 rounded-full bg-[#FF3B30] ml-0.5" />
          </div>
          <div className="flex items-center gap-5">
            <button onClick={showNotification}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                <circle cx="8.5" cy="10.5" r="1.5"/>
                <circle cx="15.5" cy="10.5" r="1.5"/>
                <path d="M12 16c-1.48 0-2.75-.81-3.45-2h6.9c-.7 1.19-1.97 2-3.45 2z"/>
              </svg>
            </button>
            <button onClick={showNotification}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <div className="w-full h-full rounded-full bg-[#000] p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#262626]" />
                  )}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0095F6] flex items-center justify-center border-2 border-black">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </div>

          <div className="flex-1 flex justify-around">
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-[16px]">{profile?.posts || 0}</span>
              <span className="text-white text-[13px]">posts</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={showNotification}>
              <span className="text-white font-bold text-[16px]">{profile?.followers || 0}</span>
              <span className="text-white text-[13px]">seguidores</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={showNotification}>
              <span className="text-white font-bold text-[16px]">{profile?.following || 0}</span>
              <span className="text-white text-[13px]">seguindo</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-white text-[14px] font-semibold">{displayName}</p>
          {profile?.bio && (
            <p className="text-white text-[14px] mt-0.5 whitespace-pre-line">{profile.bio}</p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 bg-[#1C1C1E] rounded-lg px-3 py-2.5">
          <div className="flex-1">
            <p className="text-white text-[13px] font-semibold">Painel profissional</p>
            <p className="text-[#8E8E8E] text-[12px]">Novas ferramentas já estão disponíveis.</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#5B5FC7]" />
        </div>

        <div className="mt-3 flex gap-2">
          <button className="flex-1 bg-[#363636] rounded-lg py-1.5 text-white text-[13px] font-semibold" onClick={showNotification}>
            Editar perfil
          </button>
          <button className="flex-1 bg-[#363636] rounded-lg py-1.5 text-white text-[13px] font-semibold" onClick={showNotification}>
            Compartilhar perfil
          </button>
        </div>

        {storyUsers.length > 0 && (
          <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {storyUsers.map((user, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onClick={showNotification}>
                <div className="w-[60px] h-[60px] rounded-full border-2 border-[#363636] overflow-hidden bg-[#262626]">
                  {user.avatar ? (
                    <img src={getProxiedAvatar(user.avatar)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#262626]" />
                  )}
                </div>
                <span className="text-white text-[11px] max-w-[64px] truncate">{user.username.slice(0, 8)}...</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex border-b border-[#262626] mt-1">
        <button
          className={`flex-1 py-3 flex justify-center ${activeTab === 'grid' ? 'border-b-2 border-white' : ''}`}
          onClick={() => setActiveTab('grid')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'grid' ? 'white' : '#8E8E8E'}>
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>
          </svg>
        </button>
        <button
          className={`flex-1 py-3 flex justify-center ${activeTab === 'reels' ? 'border-b-2 border-white' : ''}`}
          onClick={() => setActiveTab('reels')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'reels' ? 'white' : '#8E8E8E'}>
            <rect x="2" y="2" width="20" height="20" rx="4" stroke={activeTab === 'reels' ? 'white' : '#8E8E8E'} strokeWidth="2" fill="none"/>
            <path d="M10 8l6 4-6 4V8z" fill={activeTab === 'reels' ? 'white' : '#8E8E8E'}/>
          </svg>
        </button>
        <button
          className={`flex-1 py-3 flex justify-center ${activeTab === 'tagged' ? 'border-b-2 border-white' : ''}`}
          onClick={() => setActiveTab('tagged')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'tagged' ? 'white' : '#8E8E8E'} strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4"/>
            <rect x="2" y="2" width="20" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-[2px]">
        {fakePosts.map(post => (
          <div
            key={post.id}
            className="aspect-square bg-[#1a1a1a] relative cursor-pointer group"
            onClick={showNotification}
          >
            <div className="absolute inset-0 bg-[#111] flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#444">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
              </svg>
            </div>

            {post.isReel && (
              <div className="absolute top-2 right-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="drop-shadow">
                  <rect x="2" y="2" width="20" height="20" rx="4" stroke="white" strokeWidth="2" fill="none"/>
                  <path d="M10 8l6 4-6 4V8z" fill="white"/>
                </svg>
              </div>
            )}

            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="drop-shadow">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span className="text-white text-[12px] font-semibold drop-shadow">{post.views}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="h-16" />

      <nav className="fixed bottom-0 left-0 right-0 h-[50px] bg-[#000] border-t border-[#262626] flex items-center justify-around px-2">
        <button className="p-3" onClick={() => router.push(`/feed?${searchParams.toString()}`)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="p-3" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 8l6 4-6 4V8z" fill="white" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="p-3 relative" onClick={() => router.push(`/direct?${searchParams.toString()}`)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
          </svg>
        </button>
        <button className="p-3" onClick={showNotification}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="p-3">
          <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#262626]" />
            )}
          </div>
        </button>
      </nav>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PerfilContent />
    </Suspense>
  );
}
