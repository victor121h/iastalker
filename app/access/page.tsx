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
    setVideoSrc(`https://scripts.converteai.net/0bf1bdff-cfdb-4cfd-bf84-db4df0db7bb2/players/6973f1182e35fe9a17e222b6/v4/embed.html${search}&vl=${vl}`);
  }, []);

  if (!videoSrc) return (
    <div id="ifr_6973f1182e35fe9a17e222b6_wrapper" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative', padding: '177.78% 0 0 0' }} id="ifr_6973f1182e35fe9a17e222b6_aspect">
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', borderRadius: '12px' }} />
      </div>
    </div>
  );

  return (
    <div id="ifr_6973f1182e35fe9a17e222b6_wrapper" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative', padding: '177.78% 0 0 0' }} id="ifr_6973f1182e35fe9a17e222b6_aspect">
        <iframe
          frameBorder="0"
          allowFullScreen
          src={videoSrc}
          id="ifr_6973f1182e35fe9a17e222b6"
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
  const [showSupportMenu, setShowSupportMenu] = useState(false);
  const [showRefundPopup, setShowRefundPopup] = useState(false);
  const [refundEmail, setRefundEmail] = useState('');
  const [refundSubmitted, setRefundSubmitted] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [helpEmail, setHelpEmail] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpSubmitted, setHelpSubmitted] = useState(false);
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
      <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 py-3 px-4">
        <a 
          href="/cadastro"
          className="flex items-center justify-center gap-2 text-white font-semibold text-sm md:text-base hover:opacity-90 transition-opacity"
        >
          <span>Click here to create your IA Observer account</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
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
              href={appendUtmToLink('https://go.centerpag.com/PPU38CQ4Q8H')}
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
        <motion.a
          href="/detetive"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="block mb-6 bg-purple-900/40 border-2 border-purple-500/50 rounded-xl p-4 cursor-pointer hover:bg-purple-900/60 hover:border-purple-400 transition-all duration-300 group"
          style={{
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
            animation: 'pulse-glow 2s ease-in-out infinite'
          }}
        >
          <style jsx>{`
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
              50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.6); }
            }
          `}</style>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-800/50 flex items-center justify-center border border-purple-500/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">Private Investigator</h3>
                <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <p className="text-gray-400 text-sm">Complete personalized investigation with a real detective</p>
            </div>
          </div>
          <div className="mt-3">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-600/30 text-purple-300 border border-purple-500/30">
              Personalized
            </span>
          </div>
        </motion.a>

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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Profiles that {profile?.username || 'this profile'} follows
          </h2>
          
          {following.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {following.map((user, index) => (
                <motion.div
                  key={user.pk}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.03 }}
                  className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2"
                >
                  <img
                    src={getProxiedAvatar(user.avatar)}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.username}</p>
                    <p className="text-gray-500 text-xs truncate">{user.fullName}</p>
                  </div>
                  {user.isVerified && (
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No profiles found or private profile</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('likes')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'likes'
                  ? 'text-red-500 bg-red-500/10 border-b-2 border-red-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Likes
              </span>
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'comments'
                  ? 'text-blue-500 bg-blue-500/10 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Comments
              </span>
            </button>
            <button
              onClick={() => router.push('/cadastro')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'directs'
                  ? 'text-purple-500 bg-purple-500/10 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Direct
              </span>
            </button>
          </div>

          <div className="p-4">
            {activeTab === 'likes' && (
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-3">Profiles that receive the most likes from {profile?.username}</h3>
                {reportData.likes.length > 0 ? (
                  reportData.likes.map((item, index) => (
                    <motion.div
                      key={item.username}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between bg-gray-800/40 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <p className="text-white font-medium">@{item.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{item.count}</p>
                        <p className="text-gray-500 text-xs">likes</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-3">Profiles that receive the most comments from {profile?.username}</h3>
                {reportData.comments.length > 0 ? (
                  reportData.comments.map((item, index) => (
                    <motion.div
                      key={item.username}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between bg-gray-800/40 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <p className="text-white font-medium">@{item.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 font-bold">{item.count}</p>
                        <p className="text-gray-500 text-xs">comments</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </div>
            )}

            {activeTab === 'directs' && (
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-3">Direct messages sent by {profile?.username}</h3>
                <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3 mb-4">
                  <p className="text-purple-300 text-sm">
                    The complete direct messages will appear after our team installs IA Observer on your phone.
                  </p>
                </div>
                {reportData.directs.length > 0 ? (
                  reportData.directs.map((item, index) => (
                    <motion.div
                      key={item.username}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between bg-gray-800/40 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <p className="text-white font-medium">@{item.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 font-bold">{item.count}</p>
                        <p className="text-gray-500 text-xs">messages</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </div>
            )}
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

      {/* Support Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <AnimatePresence>
          {showSupportMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 flex flex-col gap-2"
            >
              <button
                onClick={() => {
                  setShowSupportMenu(false);
                  setShowHelpPopup(true);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Ask for Help
              </button>
              <button
                onClick={() => {
                  setShowSupportMenu(false);
                  setShowRefundPopup(true);
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Request Refund
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowSupportMenu(!showSupportMenu)}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-lg"
        >
          Need help?
        </button>
      </div>

      {/* Refund Popup */}
      <AnimatePresence>
        {showRefundPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => {
              if (!refundSubmitted) {
                setShowRefundPopup(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-[380px] w-full bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {!refundSubmitted ? (
                <>
                  <h2 className="text-white text-xl font-bold mb-4">Request Refund</h2>
                  <p className="text-gray-400 text-sm mb-6">Enter your purchase email address</p>
                  <input
                    type="email"
                    value={refundEmail}
                    onChange={(e) => setRefundEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (refundEmail.includes('@')) {
                        setRefundSubmitted(true);
                      }
                    }}
                    disabled={!refundEmail.includes('@')}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    Submit Request
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <h2 className="text-white text-xl font-bold mb-4">Refund Requested</h2>
                  <p className="text-gray-300 text-sm mb-6">
                    Your refund has been requested. The money will be deposited into your account within 10 business days.
                  </p>
                  <button
                    onClick={() => {
                      setShowRefundPopup(false);
                      setRefundSubmitted(false);
                      setRefundEmail('');
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Popup */}
      <AnimatePresence>
        {showHelpPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => {
              if (!helpSubmitted) {
                setShowHelpPopup(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-[380px] w-full bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {!helpSubmitted ? (
                <>
                  <h2 className="text-white text-xl font-bold mb-4">Ask for Help</h2>
                  <p className="text-gray-400 text-sm mb-4">Enter your email and describe what you need help with</p>
                  <input
                    type="email"
                    value={helpEmail}
                    onChange={(e) => setHelpEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-purple-500"
                  />
                  <textarea
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    placeholder="Describe what you need help with..."
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-purple-500 resize-none"
                  />
                  <button
                    onClick={() => {
                      if (helpEmail.includes('@') && helpMessage.trim()) {
                        setHelpSubmitted(true);
                      }
                    }}
                    disabled={!helpEmail.includes('@') || !helpMessage.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    Send
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <h2 className="text-white text-xl font-bold mb-4">Message Sent</h2>
                  <p className="text-gray-300 text-sm mb-6">
                    Our team will contact you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setShowHelpPopup(false);
                      setHelpSubmitted(false);
                      setHelpEmail('');
                      setHelpMessage('');
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
