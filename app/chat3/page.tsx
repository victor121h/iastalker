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

function MediaButton({ type, onClick }: { type: 'Foto' | 'Vídeo'; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 bg-[#1E2A39] hover:bg-[#2a3a4a] px-4 py-2.5 rounded-full transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span className="text-white text-sm font-medium">{type}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
    </button>
  );
}

function RestrictedContentCard({ onClick }: { onClick: () => void }) {
  return (
    <div 
      className="w-[200px] bg-gradient-to-b from-[#1a1f2e] to-[#14181D] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer border border-white/5 shadow-lg"
      onClick={onClick}
    >
      <div className="w-16 h-16 flex items-center justify-center mb-4">
        <LockIcon size={40} />
      </div>
      <p className="text-white text-sm font-medium">Conteúdo restrito</p>
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

function Chat3Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const username = searchParams.get('username') || '';
  const profileAvatar = '/attached_assets/chat2_1764243660020.png';

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
              <BlurredText text="ontem" />, :12
            </span>
          </div>

          {/* Message 1 - Received */}
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
              <div className="bg-[#1E2A39] rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-white text-[15px]">preciso falar contigo parada séria</p>
              </div>
            </div>
          </div>

          {/* Message 2 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#B06AF8] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">desculpa a demora estava <BlurredText text="ocupado com algo" /></p>
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
              <div className="bg-[#1E2A39] rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-white text-[15px]">vai tá livre <BlurredText text="sexta feira" /> da semana que vem?</p>
              </div>
            </div>
          </div>

          {/* Message 4 - Received */}
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
              <div className="bg-[#1E2A39] rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-white text-[15px]">de noitee no caso</p>
              </div>
            </div>
          </div>

          {/* Message 5 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#B06AF8] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">acho que sim, mas te aviso</p>
              </div>
            </div>
          </div>

          {/* Message 6 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#B06AF8] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">pq?</p>
              </div>
            </div>
          </div>

          {/* Message 7 - Sent */}
          <div className="flex justify-end">
            <div className="max-w-[60%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#B06AF8] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]">não kkk <BlurredText text="ela vai viajar com outra" /></p>
              </div>
            </div>
          </div>

          {/* Large spacing */}
          <div className="h-8" />

          {/* Message 8 - Received with media buttons */}
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
              <div className="space-y-2">
                <div className="bg-[#1E2A39] rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-white text-[15px]">olha</p>
                </div>
                <div className="flex items-center gap-2">
                  <MediaButton type="Foto" onClick={showNotification} />
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#1E2A39] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MediaButton type="Vídeo" onClick={showNotification} />
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#1E2A39] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Large spacing for centered empty area */}
          <div className="h-16" />

          {/* Message and Restricted Content Card side by side */}
          <div className="flex justify-end items-end gap-4">
            <div className="max-w-[40%]">
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#B06AF8] rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-white text-[15px]"><BlurredText text="olha que interessante agora" /></p>
              </div>
            </div>
            <RestrictedContentCard onClick={showNotification} />
          </div>

        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#121417] border-t border-white/10 px-4 py-3">
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

export default function Chat3Page() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Chat3Content />
    </Suspense>
  );
}
