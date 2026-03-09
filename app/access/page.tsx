'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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

interface ReportData {
  likes: { username: string; count: number; lastDate: string }[];
  comments: { username: string; count: number }[];
  directs: { username: string; count: number }[];
}

function VideoPlayer() {
  const [videoSrc, setVideoSrc] = useState('');
  
  useEffect(() => {
    const search = window.location.search || '?';
    const vl = encodeURIComponent(window.location.href);
    setVideoSrc(`https://scripts.converteai.net/0bf1bdff-cfdb-4cfd-bf84-db4df0db7bb2/players/69ae20fba584f1a405ffce36/v4/embed.html${search}&vl=${vl}`);
  }, []);

  if (!videoSrc) return (
    <div id="ifr_69ae20fba584f1a405ffce36_wrapper" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative', padding: '177.78% 0 0 0' }} id="ifr_69ae20fba584f1a405ffce36_aspect">
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', borderRadius: '12px' }} />
      </div>
    </div>
  );

  return (
    <div id="ifr_69ae20fba584f1a405ffce36_wrapper" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative', padding: '177.78% 0 0 0' }} id="ifr_69ae20fba584f1a405ffce36_aspect">
        <iframe
          frameBorder="0"
          allowFullScreen
          src={videoSrc}
          id="ifr_69ae20fba584f1a405ffce36"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          referrerPolicy="origin"
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}

function AccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlUsername = searchParams.get('username') || '';
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(!!urlUsername);
  const [activeTab, setActiveTab] = useState<'likes' | 'comments' | 'directs'>('likes');
  const [showPopup, setShowPopup] = useState(true);
  const [inputUsername, setInputUsername] = useState('');
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    likes: [],
    comments: [],
    directs: []
  });

  useEffect(() => {
    // Load smartplayer SDK script
    const sdkScript = document.createElement('script');
    sdkScript.src = 'https://scripts.converteai.net/lib/js/smartplayer-wc/v4/sdk.js';
    sdkScript.async = true;
    document.head.appendChild(sdkScript);

    return () => {
      if (sdkScript.parentNode) sdkScript.parentNode.removeChild(sdkScript);
    };
  }, []);

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const appendUtmToLink = (baseLink: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      return `${baseLink}?${utmParams}`;
    }
    return baseLink;
  };

  useEffect(() => {
    if (urlUsername) {
      const timer = setTimeout(() => {
        setShowVerifyPopup(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [urlUsername]);

  const handleSearch = async () => {
    const cleanUsername = inputUsername.replace('@', '').trim();
    if (cleanUsername) {
      setShowPopup(false);
      let utmString = '';
      try {
        const res = await fetch(`/api/user-utms?username=${encodeURIComponent(cleanUsername)}`);
        const data = await res.json();
        if (data.utms) {
          const params = new URLSearchParams();
          Object.entries(data.utms).forEach(([key, value]) => {
            params.set(key, value as string);
          });
          utmString = params.toString();
        }
      } catch (e) {}
      const base = `/access?username=${encodeURIComponent(cleanUsername)}`;
      router.push(utmString ? `${base}&${utmString}` : base);
    }
  };

  const getProxiedAvatar = (url: string) => {
    if (url && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url || '/logo-insta.png';
  };

  const generateMockReportData = (followingList: FollowingUser[]) => {
    const shuffled = [...followingList].sort(() => Math.random() - 0.5);
    
    const likes = shuffled.slice(0, Math.min(20, shuffled.length)).map(user => ({
      username: user.username,
      count: Math.floor(Math.random() * 150) + 20,
      lastDate: generateRandomDate()
    }));

    const comments = shuffled.slice(0, Math.min(8, shuffled.length)).map(user => ({
      username: user.username,
      count: Math.floor(Math.random() * 9) + 1
    }));

    const directs = shuffled.slice(0, Math.min(20, shuffled.length)).map(user => ({
      username: user.username,
      count: Math.floor(Math.random() * 50) + 10
    }));

    return { likes, comments, directs };
  };

  const generateRandomDate = () => {
    const days = Math.floor(Math.random() * 30) + 1;
    if (days === 1) return 'Today';
    if (days === 2) return 'Yesterday';
    return `${days} days ago`;
  };

  useEffect(() => {
    if (urlUsername) {
      setLoading(true);
      setShowPopup(false);
      
      fetch(`/api/instagram?username=${encodeURIComponent(urlUsername)}`)
        .then(res => res.json())
        .then(data => {
          setProfile(data);
          
          if (data.pk) {
            return fetch(`/api/instagram/following?userId=${data.pk}`);
          }
          throw new Error('No pk found');
        })
        .then(res => res.json())
        .then(data => {
          if (data.following) {
            setFollowing(data.following);
            setReportData(generateMockReportData(data.following));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      setShowPopup(true);
    }
  }, [urlUsername]);

  if (!urlUsername && !loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
        <AnimatePresence>
          {showPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                  <h2 className="text-white text-xl font-bold mb-2">Search Profile</h2>
                  <p className="text-gray-400 text-sm">Enter the @ of the profile you want to analyze</p>
                </div>

                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">@</span>
                  <input
                    type="text"
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="username"
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-4 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleSearch}
                  disabled={!inputUsername.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Spy
                </button>

                <p className="text-gray-500 text-xs text-center mt-4">
                  The report will be generated based on public profile information
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading report...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 pb-20">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 py-5 px-4">
        <a 
          href="/cadastro"
          className="flex items-center justify-center gap-3 text-white font-bold text-base md:text-lg hover:opacity-90 transition-opacity animate-pulse"
        >
          <span>Click here to create your IA Observer account</span>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </a>
      </div>
      <div className="p-4">
      <AnimatePresence>
        {showVerifyPopup && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-[100] max-w-[420px] mx-auto bg-white rounded-[24px] p-6 text-center"
            style={{ boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3)' }}
          >
            <button
              onClick={() => setShowVerifyPopup(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            <div className="flex justify-center mb-4">
              <div className="w-[50px] h-[50px] bg-[#4A90D9] rounded-xl flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
            </div>

            <h1 className="text-[#1a1a1a] text-xl font-bold leading-tight mb-4">
              FINAL STEP
            </h1>
            
            <p className="text-[#666666] text-sm mb-4 leading-relaxed">
              You need to verify your identity and prove you're not a robot. We were experiencing hacker attacks on our servers.
            </p>

            <p className="text-[#1a1a1a] text-base font-bold mb-3">
              Verification Fee: <span className="text-[#4A90D9]">$59.90</span>
            </p>

            <p className="text-[#4A90D9] text-xs mb-3 leading-relaxed font-semibold">
              But don't worry, this amount will be refunded once your account is confirmed in the system.
            </p>

            <p className="text-red-500 text-xs mb-4 leading-relaxed font-semibold bg-red-50 p-2 rounded-lg">
              If we don't identify your payment to verify your account, your access will be lost in the next two hours.
            </p>

            <a
              href={appendUtmToLink('https://go.centerpag.com/PPU38CQ8ACN')}
              className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full text-white font-bold text-sm transition-all duration-300 hover:opacity-90 hover:scale-[1.02] mb-3 bg-[#4A90D9]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              VERIFY MY ACCOUNT
            </a>

            <div className="flex items-center justify-center gap-2 text-[#888888] text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>100% Anonymous. The person will <span className="text-[#4A90D9] font-bold">NEVER</span> know.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <h2 className="text-white text-xl font-bold mb-2">Search Profile</h2>
                <p className="text-gray-400 text-sm">Enter the @ of the profile you want to analyze</p>
              </div>

              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">@</span>
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="username"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl py-4 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  autoFocus
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={!inputUsername.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Spy
              </button>

              <p className="text-gray-500 text-xs text-center mt-4">
                The report will be generated based on public profile information
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto">
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center gap-4">
              <img
                src={getProxiedAvatar(profile.avatar)}
                alt={profile.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-white text-xl font-bold">{profile.username}</h1>
                  {profile.isVerified && (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  )}
                  {profile.isPrivate && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">Private</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{profile.name}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-gray-300"><b className="text-white">{profile.posts}</b> posts</span>
                  <span className="text-gray-300"><b className="text-white">{profile.followers?.toLocaleString()}</b> followers</span>
                  <span className="text-gray-300"><b className="text-white">{profile.following}</b> following</span>
                </div>
              </div>
            </div>
            {profile.bio && (
              <p className="text-gray-400 text-sm mt-4 whitespace-pre-line">{profile.bio}</p>
            )}
          </motion.div>
        )}

        {/* Video Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 mb-6"
        >
          <VideoPlayer />

          <div className="flex flex-col gap-3 mt-6">
            <a
              href={appendUtmToLink('/up1')}
              className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Activate your plan
            </a>
            <a
              href={appendUtmToLink('/up3')}
              className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl text-white font-bold text-base transition-all duration-300 hover:opacity-90 hover:scale-[1.02] bg-[#4A90D9]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Verify your account
            </a>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-600 text-xs text-center mt-6"
        >
          Report generated on {new Date().toLocaleDateString('en-US')} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </motion.p>
      </div>

      </div>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>}>
      <AccessContent />
    </Suspense>
  );
}
