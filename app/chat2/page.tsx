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

function LockIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" className="drop-shadow-lg">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="currentColor"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function LocationCard({ onClick }: { onClick: () => void }) {
  const censoredName = 'j*****';
  
  return (
    <div className="w-[180px] rounded-xl overflow-hidden bg-[#1C2125] cursor-pointer" onClick={onClick}>
      <div className="relative h-[100px] bg-gradient-to-br from-[#2a3a4a] to-[#1a2a3a] overflow-hidden">
        <div className="absolute inset-0 blur-[8px] opacity-60">
          <div className="w-full h-full bg-[#3a5a7a] flex items-center justify-center">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" opacity="0.3">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <LockIcon size={24} />
          </div>
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-white text-sm font-medium">Localização atual</p>
        <p className="text-[#9CA3AF] text-xs">{censoredName} está compartilhando</p>
        <button className="w-full mt-2 py-2 bg-[#1E3A5F] hover:bg-[#2a4a6f] text-white text-sm font-medium rounded-lg transition-colors">
          Ver
        </button>
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F1215] flex flex-col">
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

function Chat2Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const username = searchParams.get('username') || '';
  const profileAvatar = '/attached_assets/chat2_1764243660020.png';
  const [userCity, setUserCity] = useState<string>('São Paulo');

  useEffect(() => {
    const fetchCity = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          if (data.city) {
            setUserCity(data.city);
          }
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    };

    fetchCity();
  }, []);

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

  const censoredName = username ? `${username.charAt(0)}${'*'.repeat(Math.min(3, username.length - 1))}` : 'j***';

  const handleBack = () => {
    router.push(buildUrlWithParams('/direct'));
  };

  const handleUnlockClick = () => {
    router.push(buildUrlWithParams('/pitch'));
  };

  return (
    <div className="min-h-screen bg-[#0F1215] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-[#0F1215] border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 -ml-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <div className="w-full h-full rounded-full bg-[#0F1215] p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <ImageWithFallback
                    src={profileAvatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-[#0F1215]">
              <LockIcon size={12} />
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">{censoredName}</span>
            <span className="text-[#9CA3AF] text-xs">offline</span>
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

      {/* Chat Messages */}
      <div className="flex-1 pt-[60px] pb-[70px] px-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 space-y-5">
          
          {/* Date separator */}
          <div className="flex justify-center py-4">
            <span className="text-white/40 text-xs px-3 py-1 rounded-full bg-white/5">
              <BlurredText text="ontem" />, 4:47
            </span>
          </div>

          {/* Message 1 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">ei, tá aí?</p>
              </div>
            </div>
          </div>

          {/* Message 2 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">na <BlurredText text="quinta" /> dessa semana consigo <BlurredText text="ir aí" /></p>
              </div>
            </div>
          </div>

          {/* Message 3 - Received */}
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[60%]">
              <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={profileAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <LockIcon size={10} />
                </div>
              </div>
              <div className="bg-[#1C2125] rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-white text-[15px]">uai mas e <BlurredText text="a fulana" /> não vai tá com vc não?</p>
              </div>
            </div>
          </div>

          {/* Message 4 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">não kkk <BlurredText text="ela vai viajar com a mãe dela pra outro lugar" /></p>
              </div>
            </div>
          </div>

          {/* Message 5 - Received */}
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[60%]">
              <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={profileAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <LockIcon size={10} />
                </div>
              </div>
              <div className="bg-[#1C2125] rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-white text-[15px]">ai ai kkkkkk <BlurredText text="ela" /> <BlurredText text="confia em vc" /></p>
              </div>
            </div>
          </div>

          {/* Message 6 - Received */}
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[60%]">
              <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={profileAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <LockIcon size={10} />
                </div>
              </div>
              <div className="bg-[#1C2125] rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-white text-[15px]">vou te mandar a localização</p>
              </div>
            </div>
          </div>

          {/* Location Card - Received */}
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={profileAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <LockIcon size={10} />
                </div>
              </div>
              <LocationCard onClick={showNotification} />
            </div>
          </div>

          {/* Message 7 - Received (after location) */}
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[60%]">
              <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={profileAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <LockIcon size={10} />
                </div>
              </div>
              <div className="bg-[#1C2125] rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-white text-[15px]">Em {userCity} viu</p>
              </div>
            </div>
          </div>

          {/* Message 8 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]"><BlurredText text="ok amor" /></p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F1215] border-t border-white/10 px-4 py-3">
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
            onClick={handleUnlockClick}
          >
            <span className="text-white/40 text-[15px]">Mensagem...</span>
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
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Chat2Page() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Chat2Content />
    </Suspense>
  );
}
