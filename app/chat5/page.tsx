'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';

function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return <div className={className} style={{ backgroundColor: '#262626' }} />;
  }

  return (
    <div className="relative">
      {!isLoaded && (
        <div className={`absolute inset-0 ${className} animate-pulse`} style={{ backgroundColor: '#262626' }} />
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

function BlurredText({ text }: { text: string }) {
  return (
    <span className="inline-block px-2 py-0.5 bg-[#3a3a3a] rounded blur-[4px] select-none">
      {text}
    </span>
  );
}

const WAVEFORM_HEIGHTS = [12, 18, 24, 16, 20, 14, 22, 18, 16, 24, 20, 14, 18, 22, 16, 20, 24, 14, 18, 16];

function AudioMessage({ 
  isReceived, 
  duration,
  onClick
}: { 
  isReceived: boolean; 
  duration: string;
  onClick: () => void;
}) {
  return (
    <div 
      className={`rounded-2xl p-3 cursor-pointer ${
        isReceived 
          ? 'bg-[#1B1F23]' 
          : 'bg-gradient-to-r from-[#8740FF] to-[#B768FF]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
            <path d="M0 0L12 7L0 14V0Z" />
          </svg>
        </button>
        <div className="flex items-center gap-[2px]">
          {WAVEFORM_HEIGHTS.map((height, i) => (
            <div 
              key={i} 
              className={`w-[2px] rounded-full ${isReceived ? 'bg-white/70' : 'bg-white/80'}`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <span className="text-white/70 text-xs ml-2">{duration}</span>
      </div>
      <button className="text-white/60 text-xs mt-2 hover:text-white/80 transition-colors">
        View transcription
      </button>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-[#111418] flex flex-col">
      <div className="h-16 border-b border-white/10 animate-pulse bg-[#1a1a1a]" />
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className="h-12 w-48 rounded-2xl animate-pulse bg-[#1a1a1a]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Chat5Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const username = searchParams.get('username') || '';
  const profileAvatar = '/attached_assets/chat2_1764243660020.png';
  const [userName, setUserName] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('user_name') || '';
    setUserName(storedName);
  }, []);

  const handleUnlockMessages = async () => {
    if (unlocking) return;
    setUnlocking(true);
    const storedEmail = localStorage.getItem('user_email') || '';
    if (!storedEmail) {
      router.push(buildUrlWithParams('/buy'));
      return;
    }
    try {
      const creditsRes = await fetch(`/api/credits?email=${encodeURIComponent(storedEmail)}`);
      const creditsData = await creditsRes.json();
      const available = (creditsData.credits?.total || 0) - (creditsData.credits?.used || 0);
      if (available < 750) {
        router.push(buildUrlWithParams('/buy'));
        return;
      }
      const deductRes = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail, credits: 750, action: 'use' }),
      });
      if (deductRes.ok) {
        router.push(buildUrlWithParams('/buy'));
      } else {
        router.push(buildUrlWithParams('/buy'));
      }
    } catch {
      router.push(buildUrlWithParams('/buy'));
    } finally {
      setUnlocking(false);
    }
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    
    const paramsToCopy = ['username', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    paramsToCopy.forEach(param => {
      const value = searchParams.get(param);
      if (value) params.set(param, value);
    });
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const censoredName = 'A****';
  const displayName = userName || 'them';

  const handleBack = () => {
    router.push(buildUrlWithParams('/direct'));
  };

  return (
    <div className="min-h-screen bg-[#111418] flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-[#111418] border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 -ml-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <div className="w-full h-full rounded-full bg-[#111418] p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <ImageWithFallback
                    src={profileAvatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">{censoredName}</span>
            <span className="text-[#4ADE80] text-xs">online</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={showNotification} className="p-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <button onClick={showNotification} className="p-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="fixed top-[60px] left-0 right-0 z-40">
        <button
          onClick={handleUnlockMessages}
          disabled={unlocking}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 px-4 flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
        >
          {unlocking ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span className="text-white font-bold text-sm">Processing...</span>
            </div>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <span className="text-white font-bold text-sm md:text-base text-center">Unlock +354 messages from this conversation & +4 directs about this subject — 750 credits</span>
              <span className="relative flex h-3 w-3 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 pt-[116px] pb-[70px] px-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          
          <div className="flex justify-center py-4">
            <span className="text-white/40 text-xs px-3 py-1 rounded-full bg-white/5">
              <BlurredText text="today" />, 23:42
            </span>
          </div>

          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#8740FF] to-[#B768FF] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">I have a guilty conscience for doing this to {displayName}, I don't know how to tell</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#8740FF] to-[#B768FF] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">I wish I could go back to the beginning</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#8740FF] to-[#B768FF] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">The worst part is knowing that I always wanted this</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#8740FF] to-[#B768FF] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">{displayName} can never even dream about this</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#8740FF] to-[#B768FF] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">But this weighs on my mind so much</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <div className="max-w-[60%]">
              <AudioMessage isReceived={false} duration="1:24" onClick={showNotification} />
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#8740FF] to-[#B768FF] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">Do you think I should tell {displayName}?</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#111418] border-t border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-tr from-[#405DE6] to-[#833AB4]">
            <div className="w-full h-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
          </div>
          
          <div 
            className="flex-1 bg-transparent border border-white/20 rounded-full px-4 py-2.5 flex items-center cursor-pointer"
            onClick={showNotification}
          >
            <span className="text-white/40 text-[15px]">Message...</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={showNotification} className="p-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M12 18.5a6.5 6.5 0 006.5-6.5V7a6.5 6.5 0 10-13 0v5a6.5 6.5 0 006.5 6.5z"/>
                <path d="M19 12v.5a7 7 0 01-14 0V12"/>
                <path d="M12 18.5V22"/>
              </svg>
            </button>
            <button onClick={showNotification} className="p-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </button>
            <button onClick={showNotification} className="p-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Chat5Page() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Chat5Content />
    </Suspense>
  );
}
