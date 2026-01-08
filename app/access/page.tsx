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
  const [reportData, setReportData] = useState<ReportData>({
    likes: [],
    comments: [],
    directs: []
  });

  const handleSearch = () => {
    const cleanUsername = inputUsername.replace('@', '').trim();
    if (cleanUsername) {
      setShowPopup(false);
      router.push(`/access?username=${encodeURIComponent(cleanUsername)}`);
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
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 p-4 pb-20">
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
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center"
        >
          <p className="text-red-500 font-semibold text-sm md:text-base">
            Your full access will be released in 7 days. For now, enjoy the complete report of the profile you searched.
          </p>
        </motion.div>

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
              onClick={() => setActiveTab('directs')}
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
