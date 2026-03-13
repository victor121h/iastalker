'use client';

import { Suspense, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';

function BlurredText({ text }: { text: string }) {
  return (
    <span className="inline-block px-1 bg-[#3a3a3a] rounded blur-[4px] select-none">
      {text}
    </span>
  );
}

function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-[#000] flex flex-col">
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
  const { showNotification, barHeight } = useNotification();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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

  const censoredName = 'L*****';

  const handleBack = () => {
    router.push(buildUrlWithParams('/direct'));
  };

  return (
    <div className="min-h-screen bg-[#000] flex flex-col">
      <header className="fixed left-0 right-0 z-50 h-[60px] bg-[#000] border-b border-white/10 flex items-center justify-between px-4" style={{ top: barHeight }}>
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 -ml-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#262626]">
            <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
          </div>
          
          <div className="flex flex-col">
            <span className="text-white font-semibold text-[14px]">{censoredName}</span>
            <span className="text-[#8E8E8E] text-[12px]">Online 6h ago</span>
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

      <div className="flex-1 pb-[70px] px-4 overflow-y-auto" style={{ paddingTop: barHeight + 60 }}>
        <div className="max-w-lg mx-auto py-4 space-y-3">

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2.5 max-w-[65%]">
              <div className="flex items-center gap-2 mb-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <span className="text-white text-[14px]">Video call</span>
              </div>
              <span className="text-[#8E8E8E] text-[12px]">14:51</span>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 flex-shrink-0" />
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2.5 max-w-[65%]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-[#E53935] flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M23 7l-7 5 7 5V7z"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </div>
                <span className="text-[#E53935] text-[14px] font-medium">Missed video call</span>
              </div>
              <button className="text-[#5B7FFF] text-[14px]" onClick={showNotification}>Call back</button>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">Bad connection</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">I&apos;m on 4G</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">Call again</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2.5 max-w-[65%]">
              <div className="flex items-center gap-2 mb-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <span className="text-white text-[14px]">Video call</span>
              </div>
              <span className="text-[#8E8E8E] text-[12px]">14:53</span>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2.5 max-w-[65%]">
              <div className="flex items-center gap-2 mb-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <span className="text-white text-[14px]">Video call ended</span>
              </div>
              <span className="text-[#8E8E8E] text-[12px]">13:07</span>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">So hot</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">😍😍😍</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1 max-w-[75%]">
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2">
                <p className="text-white text-[15px]">Look what you did to me</p>
              </div>
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm w-[180px] h-[200px] flex items-center justify-center cursor-pointer" onClick={showNotification}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </div>
              <div className="pl-1">
                <span className="text-[18px]">❤️</span>
              </div>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Haha</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">OH MY GOD</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">So hot</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">💜💜💜</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Send more of yours too</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="space-y-1 max-w-[75%]">
              <div className="bg-[#1a1a2e] rounded-2xl rounded-br-sm w-[200px] h-[240px] flex items-center justify-center cursor-pointer" onClick={showNotification}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="space-y-1">
              <div className="flex justify-end gap-1">
                <div className="bg-[#2a2a3e] rounded-2xl w-[160px] h-[170px] cursor-pointer opacity-70" onClick={showNotification} style={{ filter: 'blur(3px)' }} />
              </div>
              <div className="flex justify-end">
                <div className="bg-[#222238] rounded-2xl w-[170px] h-[160px] cursor-pointer opacity-60" onClick={showNotification} style={{ filter: 'blur(4px)' }} />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <span className="text-[22px]">😈</span>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">I asked for one and you sent 3</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">That&apos;s why I love you</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">I have to go it&apos;s risky</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]"><BlurredText text="my girlfriend" /> is arriving</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Relax, we&apos;ll see each other soon</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">I can&apos;t take it anymore</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="space-y-1">
              <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
                <p className="text-white text-[15px]">Don&apos;t send anything else ok</p>
              </div>
              <div className="flex justify-end pr-1">
                <span className="text-[18px]">👍</span>
              </div>
            </div>
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#000] border-t border-white/10 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={showNotification} className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#405DE6] via-[#5851DB] to-[#833AB4] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
          </button>
          
          <div 
            className="flex-1 bg-transparent border border-white/20 rounded-full px-4 py-2 flex items-center cursor-pointer"
            onClick={showNotification}
          >
            <span className="text-white/40 text-[14px]">Mensagem...</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={showNotification} className="p-1.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </button>
            <button onClick={showNotification} className="p-1.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </button>
            <button onClick={showNotification} className="p-1.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
            <button onClick={showNotification} className="p-1.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
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
