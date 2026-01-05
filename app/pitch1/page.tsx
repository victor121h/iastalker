'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getProfileCache } from '@/lib/profileCache';

const MatrixBackground = dynamic(() => import('@/components/MatrixBackground'), { ssr: false });

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

function PitchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlUsername = searchParams.get('username') || '';
  const searchParamsString = searchParams.toString();
  
  const [username, setUsername] = useState(urlUsername);
  
  useEffect(() => {
    if (urlUsername) {
      sessionStorage.setItem('pitch_username', urlUsername);
      document.cookie = `pitch_username=${encodeURIComponent(urlUsername)}; path=/; max-age=31536000`;
      setUsername(urlUsername);
    } else {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key] = decodeURIComponent(value);
        return acc;
      }, {} as Record<string, string>);
      const cookieUsername = cookies['pitch_username'];
      const storedUsername = cookieUsername || sessionStorage.getItem('pitch_username');
      if (storedUsername) {
        const params = new URLSearchParams(searchParamsString);
        params.set('username', storedUsername);
        router.replace(`/pitch1?${params.toString()}`);
        setUsername(storedUsername);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUsername]);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTimeLeft, setWarningTimeLeft] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pitch1_timer_end');
      if (saved) {
        const endTime = parseInt(saved);
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        if (remaining > 0) return { minutes, seconds };
      }
      const endTime = Date.now() + 20 * 60 * 1000;
      localStorage.setItem('pitch1_timer_end', endTime.toString());
    }
    return { minutes: 20, seconds: 0 };
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    document.cookie = 'deepgram_visited=true; path=/; max-age=31536000';
  }, []);

  useEffect(() => {
    if (username) {
      const cached = getProfileCache(username);
      if (cached?.profile) {
        setProfile(cached.profile as ProfileData);
        return;
      }

      fetch(`/api/instagram?username=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => setProfile(data))
        .catch(console.error);
    }
  }, [username]);

  useEffect(() => {
    const warningTimer = setInterval(() => {
      setWarningTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(warningTimer);
  }, []);

  useEffect(() => {
    let retryTimer: NodeJS.Timeout | null = null;
    let isMounted = true;
    
    const startCamera = async () => {
      if (!showCameraModal || !isMounted) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 200, height: 200 }, 
          audio: false 
        });
        
        if (isMounted) {
          setCameraStream(stream);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setCameraActive(true);
          }
        }
      } catch (err) {
        console.log('Camera denied or not available, retrying in 4 seconds...');
        setCameraActive(false);
        if (isMounted && showCameraModal) {
          retryTimer = setTimeout(startCamera, 4000);
        }
      }
    };

    const timer = setTimeout(startCamera, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [showCameraModal]);

  const capturePhotoAndProceed = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoData);
      }
    }
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    setShowCameraModal(false);
    setShowWarningModal(true);
  };

  const getProxiedAvatar = (url: string) => {
    if (url && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

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

  const purchaseLink39 = appendUtmToLink('https://go.centerpag.com/PPU38CQ4ODH');
  const purchaseLink59 = appendUtmToLink('https://go.centerpag.com/PPU38CQ4ODK');
  const purchaseLinkAllApps = appendUtmToLink('https://go.centerpag.com/PPU38CQ5DDQ');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const testimonials = [
    { id: 1, avatar: '', name: 'Maria****', time: '3h', text: 'I had suspicions, but I wasn\'t sure... When I paid for the full version I saw the DMs and hidden stories, I was floored. But at least I knew the truth.' },
    { id: 2, avatar: '', name: 'Carlos****', time: '5h', text: 'I used it on the insta of a girl I was dating and saw she had been with someone else for months. The tool gave me peace.', hasLock: true },
    { id: 3, avatar: '', name: 'Amanda****', time: '1d', text: 'I thought it was fake at first. In the full version I tried my boyfriend\'s @ and saw a lot of things lol. Location, hidden photos, even deleted conversations.' },
    { id: 4, avatar: '', name: 'Pedro****', time: '5d', text: 'the real-time location feature is really good lol', hasLock: true },
    { id: 5, avatar: '', name: 'Julia****', time: '3 wks', text: 'I can\'t live without this tool, I discovered it a few months ago on tiktok and I still use it on some suspicious profiles' },
    { id: 6, avatar: '', name: 'Lucas****', time: '2 wks', text: 'I don\'t recommend it for those who don\'t want to see the truth.' },
  ];

  const faqs = [
    { q: 'Does the tool really work?', a: 'Yes, IA Observer uses advanced technology to access public and private data from Instagram profiles.' },
    { q: 'Will the person know I spied on their profile?', a: 'No. IA Observer operates 100% invisibly and anonymously.' },
    { q: 'Does it work on private profiles?', a: 'Yes, it works on any type of profile, public or private.' },
    { q: 'Do I need to install anything?', a: 'No. The entire service works 100% online, directly from your browser.' },
    { q: 'How does the guarantee work?', a: 'We offer a 30-day guarantee. If you don\'t like it, we refund 100% of your money.' },
    { q: 'How long do I have access?', a: 'Access is lifetime. Once you purchase, you have access forever.' },
  ];

  return (
    <div className="min-h-screen bg-white relative">
      <MatrixBackground />
      <canvas ref={canvasRef} className="hidden" />

      {showCameraModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-[#0C1011] border border-[#3B82F6] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#3B82F6">
                  <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </div>
            </div>

            <h2 className="text-[#00FF75] text-center font-bold text-2xl mb-2 animate-pulse">
              Wait! You WON a 50% discount!
            </h2>

            <p className="text-white text-center text-sm mb-4">
              To claim your discount, verify you're not a robot
            </p>

            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-[#1A1A1A] border-4 border-[#3B82F6] overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="#666">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[#A0A0A0] text-center text-sm mb-2">
              Please accept the camera permission to continue.
            </p>

            <p className="text-[#FF6B6B] text-center text-xs mb-4">
              If you clicked "don't allow," reload the website to allow access to the camera again.
            </p>

            <button 
              onClick={capturePhotoAndProceed}
              disabled={!cameraActive}
              className={`w-full font-bold py-3 rounded-xl transition-colors ${
                cameraActive 
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white' 
                  : 'bg-[#1A1A1A] text-[#666] cursor-not-allowed'
              }`}
            >
              {cameraActive ? 'Continue' : 'Waiting for camera...'}
            </button>
          </motion.div>
        </motion.div>
      )}

      {showWarningModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-[#0C1011] border border-[#E53935] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#1A1A1A] border-4 border-[#E53935] overflow-hidden flex items-center justify-center">
                  {capturedPhoto ? (
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="#666">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#E53935] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
              </div>
            </div>

            <h2 className="text-white text-center font-bold text-xl mb-3">
              Important Warning
            </h2>

            <div className="bg-[#E53935]/10 border border-[#E53935]/30 rounded-xl p-4 mb-4">
              <p className="text-white text-center text-sm leading-relaxed">
                If we don't detect your payment within <span className="font-bold text-[#E53935]">20 minutes</span>, we will reveal to <span className="font-bold">@{username}</span> that you cloned their Instagram.
              </p>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-[#1A1A1A] rounded-lg px-6 py-3">
                <p className="text-[#A0A0A0] text-xs text-center mb-1">Time remaining:</p>
                <p className="text-[#E53935] text-2xl font-bold text-center font-mono">
                  {String(warningTimeLeft.minutes).padStart(2, '0')}:{String(warningTimeLeft.seconds).padStart(2, '0')}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowWarningModal(false)}
              className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-bold py-3 rounded-xl transition-colors"
            >
              I Understand
            </button>
          </motion.div>
        </motion.div>
      )}
      
      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#E53935] py-2.5 px-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button className="p-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <span>We will reveal your clone in:</span>
              <span className="font-bold">
                {String(warningTimeLeft.minutes).padStart(2, '0')}:{String(warningTimeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
            <div className="w-5" />
          </div>
        </header>

        <main className="pt-16 pb-8 px-4 max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border border-[#0f3460]/50 rounded-xl p-4 mb-4 mt-2"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00D9FF]/20 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#00D9FF">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[#00D9FF] text-xs font-semibold mb-1 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-[#00D9FF] rounded-full animate-pulse"></span>
                  AI SCAN COMPLETE
                </p>
                <p className="text-white text-sm leading-relaxed">
                  Our AI scanned the messages from <span className="font-bold text-[#00D9FF]">@{username}</span> and found <span className="font-bold text-[#FF6B6B]">+18 messages</span>; the content revealed may be sensitive for some people.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="flex items-center justify-center mb-4">
              <img src="/logo-deepgram-header.png" alt="IA Observer" className="h-[48px] w-auto" />
            </div>
            <h1 className="text-black text-xl font-bold leading-tight">
              The ultimate profile spying tool
            </h1>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <p className="text-[#A0A0A0] text-sm text-center mb-4">Full access to the profile of:</p>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div 
                  className="p-[2px] rounded-full"
                  style={{ background: 'linear-gradient(135deg, #D62976, #FA7E1E, #FEDA75, #962FBF, #4F5BD5)' }}
                >
                  <div className="bg-[#0C1011] rounded-full p-[2px]">
                    {profile?.avatar ? (
                      <img
                        src={getProxiedAvatar(profile.avatar)}
                        alt=""
                        className="w-[64px] h-[64px] rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-[64px] h-[64px] rounded-full bg-[#262626]" />
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-white font-bold text-lg">@{username}</p>
                <p className="text-[#A0A0A0] text-sm">{profile?.name || 'Loading...'}</p>
              </div>
            </div>

            <div className="flex justify-around py-3 border-y border-[#262626] mb-4">
              <div className="text-center">
                <p className="text-white font-bold">{profile?.posts || 0}</p>
                <p className="text-[#A0A0A0] text-xs">posts</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{formatNumber(profile?.followers || 0)}</p>
                <p className="text-[#A0A0A0] text-xs">followers</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{formatNumber(profile?.following || 0)}</p>
                <p className="text-[#A0A0A0] text-xs">following</p>
              </div>
            </div>

            {profile?.bio && (
              <p className="text-[#C0C0C0] text-sm text-center mb-4">{profile.bio}</p>
            )}

            <div className="bg-[#00FF75] rounded-xl py-3 px-4">
              <p className="text-black text-center text-sm font-medium">
                No password needed. No traces left. Without the person knowing.
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#EB1C8F]/20 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#EB1C8F">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">All media received and sent by @{username}</p>
                <p className="text-[#808080] text-xs mt-1">Photos, videos and files exchanged in DMs</p>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden">
              <img 
                src="/midias-bloqueadas.png" 
                alt="Blocked media" 
                className="w-full h-auto"
              />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#0C1011] rounded-[22px] overflow-hidden mb-6"
          >
            <div className="relative h-32">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("/map-blur.png")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(4px)',
                  opacity: 0.7
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a2332]/90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div 
                    className="p-[3px] rounded-full"
                    style={{ background: '#E53935' }}
                  >
                    {profile?.avatar ? (
                      <img
                        key={`location-${profile.avatar}`}
                        src={getProxiedAvatar(profile.avatar)}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#1a2332]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#262626] border-2 border-[#1a2332]" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#1a2332] px-5 py-4 text-center">
              <p className="text-white font-semibold text-base mb-1">Current location</p>
              <p className="text-[#808080] text-sm mb-4">@{username} is sharing</p>
              <button className="bg-[#2a3a4a] hover:bg-[#3a4a5a] text-white font-medium py-2.5 px-12 rounded-lg transition-colors">
                View
              </button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#962FBF]/20 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#962FBF">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Hidden stories and posts</p>
                <p className="text-[#808080] text-xs mt-1">Content that @{username} hid</p>
              </div>
            </div>
            <div className="flex gap-3">
              {[1,2].map(i => (
                <div key={i} className="flex-1 bg-[#1A1A1A] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 p-2.5 border-b border-[#2A2A2A]">
                    {profile?.avatar ? (
                      <img
                        src={getProxiedAvatar(profile.avatar)}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#262626]" />
                    )}
                    <span className="text-white text-xs font-medium">@{username}</span>
                  </div>
                  <div className="aspect-[3/4] flex flex-col items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <p className="text-[#808080] text-xs mt-3">Restricted content</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1A73E8]/20 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1A73E8">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Instagram private messages (DMs)</p>
                <p className="text-[#808080] text-xs mt-1">All conversations from @{username}</p>
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-3">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#262626]">
                <div className="relative">
                  {profile?.avatar ? (
                    <img
                      src={getProxiedAvatar(profile.avatar)}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#262626]" />
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00FF75] rounded-full border-2 border-[#1A1A1A]"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">@{username}</p>
                  <p className="text-[#00FF75] text-xs">online</p>
                </div>
                <div className="flex gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#A0A0A0">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                  </svg>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#A0A0A0">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-[#962FBF] rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%] blur-[4px]">
                    <p className="text-white text-sm">Hidden message</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%] blur-[4px]">
                    <p className="text-white text-sm">Hidden reply</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#962FBF] rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%] blur-[4px]">
                    <p className="text-white text-sm">Another message</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <div className="flex items-center justify-center mb-4">
              <img src="/logo-deepgram-header.png" alt="IA Observer" className="h-[36px] w-auto" />
            </div>

            <h2 className="text-white text-center font-bold text-lg mb-2">
              In addition to access to @{username}'s profile, you will have access to the IA Observer tool
            </h2>
            <p className="text-[#A0A0A0] text-center text-sm mb-6">
              Complete and lifetime access, meaning you can spy on as many profiles as you want, whenever you want, forever.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#EB1C8F]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EB1C8F" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Search as many profiles as you want.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00FF75]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">View all data with just one click.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#DFB313]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#DFB313">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Lifetime access without paying monthly fees.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00FF75]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">No installation needed, service runs in the cloud.</p>
              </div>
            </div>

            <a 
              href={purchaseLink59}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#E53935] rounded-xl py-4 px-4 text-center"
            >
              <p className="text-white font-bold text-sm mb-1">WITHOUT IA STALKER, YOU SEE NOTHING</p>
              <p className="text-white/80 text-xs">It's what unlocks @{username}'s data invisibly</p>
            </a>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <h2 className="text-white text-center font-bold text-xl mb-6">
              Take control of any profile in your hands!
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#E53935">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Discover an infidelity before you get played</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EB1C8F" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Spy on someone you love in silence</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#DFB313">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">See if someone is talking bad about you behind your back</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#00FF75">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Protect your family, your relationship, your peace</p>
              </div>
            </div>

            <div className="bg-[#E53935]/10 border border-[#E53935] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#E53935" className="flex-shrink-0">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <div>
                  <p className="text-white font-bold text-sm">Attention: Use with Discernment</p>
                  <p className="text-[#A0A0A0] text-xs mt-1">The information revealed can be intense and transformative. This tool exposes the naked and raw truth.</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <h2 className="text-black text-center font-bold text-xl mb-6">
              See what people who use IA Observer are saying:
            </h2>

            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <div key={t.id} className="bg-[#0C1011] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      {t.hasLock ? (
                        <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#666">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                          </svg>
                        </div>
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full"
                          style={{ background: i % 2 === 0 ? 'linear-gradient(135deg, #D62976, #FA7E1E)' : '#1A1A1A' }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium blur-[4px]">{t.name}</span>
                        <span className="text-[#666] text-xs">{t.time}</span>
                      </div>
                      <p className="text-[#A0A0A0] text-sm">{t.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#E53935] rounded-xl py-4 px-6 mt-4 text-center">
              <p className="text-white font-bold text-sm">This is the raw truth. You decide if you want to see it.</p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-6"
          >
            <div className="flex justify-center mb-4">
              <div 
                className="px-4 py-1.5 rounded-full text-sm font-bold"
                style={{ background: 'linear-gradient(90deg, #EB1C8F, #DFB313)' }}
              >
                <span className="text-white">LIMITED BLACK FRIDAY</span>
              </div>
            </div>

            <h2 className="text-black text-center font-bold text-2xl mb-1">CHOOSE YOUR PLAN</h2>
            <p className="text-[#DFB313] text-center text-sm mb-6">FOR A LIMITED TIME</p>

            <div className="bg-[#0C1011] rounded-[22px] p-5 mb-4">
              <h3 className="text-white text-center font-bold text-lg mb-1">Profile Access</h3>
              <p className="text-[#808080] text-center text-xs mb-4">Full access to @{username}'s profile</p>
              
              <p className="text-[#808080] text-center text-sm line-through mb-2">From: $130.00</p>
              <div className="bg-[#1A1A1A] rounded-xl py-4 mb-4">
                <p className="text-white text-center text-3xl font-bold"><span className="text-xl">$</span>9.90</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Full access to @{username}'s profile</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Hidden stories or posts only for close friends</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Access to media (photos and videos) received and sent by @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Real-time DMs and old DMs (up to 18 months back)</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Real-time location and frequently visited places</p>
                </div>
              </div>

              <a 
                href={purchaseLink39}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#2A3A4A] rounded-xl py-3 text-center text-white font-bold"
              >
                Choose Plan
              </a>
            </div>

            <div className="bg-[#0C1011] rounded-[22px] p-5 border-2 border-[#00FF75] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#00FF75] text-black text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
              </div>

              <h3 className="text-white text-center font-bold text-lg mb-1 mt-2">IA Observer Tool</h3>
              <p className="text-[#808080] text-center text-xs mb-4">Full access + Lifetime tool</p>
              
              <p className="text-[#808080] text-center text-sm line-through mb-2">From: $200.00</p>
              <div className="bg-[#00FF75] rounded-xl py-4 mb-4">
                <p className="text-black text-center text-3xl font-bold"><span className="text-xl">$</span>14.90</p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Full access to @{username}'s profile</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Hidden stories or posts only for close friends</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Access to media (photos and videos) received and sent by @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Real-time DMs and old DMs (up to 18 months back)</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Real-time location and frequently visited places</p>
                </div>
              </div>

              <div className="border-t border-[#262626] pt-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Spy on as many profiles as you want</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Lifetime access</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">No monthly fees</p>
                  </div>
                </div>
              </div>

              <a 
                href={purchaseLink59}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#00FF75] rounded-xl py-3 text-center text-black font-bold"
              >
                Choose Plan
              </a>
            </div>

            <div className="bg-[#0C1011] rounded-[22px] p-5 border-2 border-[#DFB313] relative mt-4">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#DFB313] text-black text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</span>
              </div>

              <h3 className="text-white text-center font-bold text-lg mb-1 mt-2">IA Observer All Apps</h3>
              <p className="text-[#808080] text-center text-xs mb-4">Full access to all spy versions</p>
              
              <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
                <p className="text-[#A0A0A0] text-xs text-center mb-3">Bundled App Access:</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">iMessage</span>
                    <span className="text-[#808080] text-sm line-through">$29.90</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">Facebook</span>
                    <span className="text-[#808080] text-sm line-through">$14.90</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">Instagram</span>
                    <span className="text-[#808080] text-sm line-through">$29.90</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">WhatsApp</span>
                    <span className="text-[#808080] text-sm line-through">$19.90</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">Snapchat</span>
                    <span className="text-[#808080] text-sm line-through">$19.90</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">Tinder</span>
                    <span className="text-[#808080] text-sm line-through">$14.90</span>
                  </div>
                  <div className="border-t border-[#262626] pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#A0A0A0] text-sm">Total value:</span>
                      <span className="text-[#808080] text-sm line-through">$129.40</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#262626] pt-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#DFB313" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">All tools are unlimited</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#DFB313" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Spy on as many people as you want</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#DFB313" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Lifetime access</p>
                  </div>
                </div>
              </div>

              <p className="text-[#DFB313] text-center text-sm font-semibold mb-2">Get all versions today for only:</p>
              <div className="bg-[#DFB313] rounded-xl py-4 mb-4">
                <p className="text-black text-center text-3xl font-bold"><span className="text-xl">$</span>24.90</p>
              </div>

              <div className="bg-[#0D2818] border border-[#00FF75]/30 rounded-xl py-2 px-4 text-center mb-4">
                <p className="text-[#00FF75] text-sm font-semibold">
                  You save $104.50 (81% OFF)
                </p>
              </div>

              <a 
                href={purchaseLinkAllApps}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#00FF75] rounded-xl py-3 text-center text-black font-bold animate-pulse"
              >
                Get All Apps
              </a>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6"
          >
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#0C1011] border border-[#262626] flex items-center justify-center mb-2 mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <p className="text-black text-xs">Lifetime Access</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#0C1011] border border-[#262626] flex items-center justify-center mb-2 mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-black text-xs">24/7 Support</p>
              </div>
            </div>

            <p className="text-[#808080] text-center text-xs mb-6">
              100% Secure Purchase - SSL Encryption
            </p>

            <div className="bg-[#00FF75] rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <div>
                  <p className="text-black font-bold">30-Day Guarantee</p>
                  <p className="text-black/70 text-sm">Try risk-free! If you don't like it, we refund 100% of your money.</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mb-8"
          >
            <h2 className="text-black text-center font-bold text-xl mb-6">Frequently Asked Questions</h2>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div 
                  key={i}
                  className="bg-[#0C1011] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00FF75]"></span>
                      <span className="text-white text-sm font-medium">{faq.q}</span>
                    </div>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#666" 
                      strokeWidth="2"
                      className={`transform transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  {expandedFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-[#A0A0A0] text-sm pl-4">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

        </main>
      </div>
    </div>
  );
}

export default function Pitch1Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000]" />}>
      <PitchContent />
    </Suspense>
  );
}
