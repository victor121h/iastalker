'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/components/PurchaseNotification';

function BlurredText({ text }: { text: string }) {
  return (
    <span className="inline-block px-1 bg-[#3a3a3a] rounded blur-[4px] select-none">
      {text}
    </span>
  );
}

const WAVEFORM_HEIGHTS = [4, 8, 14, 6, 12, 18, 8, 14, 6, 16, 10, 18, 6, 14, 8, 12, 18, 6, 10, 14, 8, 16, 6, 12];

function AudioMessage({ duration, onClick }: { duration: string; onClick: () => void }) {
  return (
    <div 
      className="rounded-2xl rounded-bl-md px-3 py-2.5 cursor-pointer bg-[#262626] inline-block"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <button className="flex-shrink-0">
          <svg width="14" height="16" viewBox="0 0 12 14" fill="white">
            <path d="M0 0L12 7L0 14V0Z" />
          </svg>
        </button>
        <div className="flex items-end gap-[2px]">
          {WAVEFORM_HEIGHTS.map((height, i) => (
            <div 
              key={i} 
              className="w-[2.5px] rounded-full bg-white/60"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <span className="text-white/50 text-[12px] ml-1">{duration}</span>
      </div>
    </div>
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

function Chat1Content() {
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

  const censoredName = 'A****';

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
            <span className="text-[#4ADE80] text-[12px]">Online</span>
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
          
          <div className="flex justify-center py-2">
            <span className="text-[#8E8E8E] text-[11px] uppercase tracking-wider">3 DAYS AGO, 11:12</span>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Hey gorgeous, guess what you forgot here? haha</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Hey love of my vidq</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">life*</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1 max-w-[75%]">
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2">
                <p className="text-white text-[15px]">I miss you</p>
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
              <p className="text-white text-[15px]">Like this??</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">🤩🤩🤩🤩🤩</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1 max-w-[75%]">
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2">
                <p className="text-white text-[15px]"><BlurredText text="I'm at the" /> <BlurredText text="place we" /></p>
              </div>
              <AudioMessage duration="0:11" onClick={showNotification} />
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]"><BlurredText text="at Ricardo" />&apos;s house.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Sounds good, tomorrow or the day after</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="px-1 py-0.5">
              <span className="text-[22px]">🤙</span>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-[#8E8E8E] text-[11px] uppercase tracking-wider">YESTERDAY, 21:34</span>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Babe</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Can you talk?</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-[75%]">
              <div className="text-[#8E8E8E] text-[11px] text-right mb-1">You replied</div>
              <div className="flex items-stretch gap-0">
                <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 flex-1">
                  <div className="border-l-2 border-white/40 pl-2 mb-1.5">
                    <span className="text-white/60 text-[13px]">Babe</span>
                  </div>
                  <p className="text-white text-[15px]">Hey bb</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Hold on, <BlurredText text="my boyfriend" /> is right next to me</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">hahahahaha</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1 max-w-[75%]">
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2">
                <p className="text-white text-[15px]">🐴🐴🐴 haha</p>
              </div>
              <div className="pl-1">
                <span className="text-[18px]">😂</span>
              </div>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1 max-w-[75%]">
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2">
                <p className="text-white text-[15px]">I&apos;m here already, just letting you know</p>
              </div>
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2">
                <p className="text-white text-[15px]"><BlurredText text="at the usual spot" /></p>
              </div>
              <div className="pl-1">
                <span className="text-[18px]">❤️</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-[40px]">💕</span>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">Where are you</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">At your cousin&apos;s?</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="max-w-[75%]">
              <div className="text-[#8E8E8E] text-[11px] mb-1">Replied to you</div>
              <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2">
                <div className="border-l-2 border-white/30 pl-2 mb-1.5">
                  <span className="text-[#7C3AED] text-[13px]">At your cousin&apos;s?</span>
                </div>
                <p className="text-white text-[15px]">No</p>
              </div>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">At <BlurredText text="Lucas" />&apos;s house</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">Ok 🤯</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="space-y-1 max-w-[75%]">
              <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
                <p className="text-white text-[15px]">I&apos;ll <BlurredText text="pick up the kids" /> and then stop by ok??</p>
              </div>
              <div className="flex justify-end pr-1">
                <span className="text-[18px]">❤️</span>
              </div>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-2 max-w-[75%]">
              <AudioMessage duration="0:32" onClick={showNotification} />
              <AudioMessage duration="0:07" onClick={showNotification} />
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2">
              <p className="text-white text-[15px]">Sure thing</p>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-[40px]">💕</span>
          </div>

          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 h-[0.5px] bg-white/20"></div>
            <span className="text-[#8E8E8E] text-[11px]">New messages</span>
            <div className="flex-1 h-[0.5px] bg-white/20"></div>
          </div>

          <div className="flex justify-center py-1">
            <span className="text-[#8E8E8E] text-[11px]">21:02</span>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Hey gorgeous, guess what you forgot here? haha</p>
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

export default function Chat1Page() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Chat1Content />
    </Suspense>
  );
}
