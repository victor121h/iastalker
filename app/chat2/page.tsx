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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"></path></svg>
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
            <img src="/icons/imgi_2_phone.png" alt="" width="24" height="24" />
          </button>
          <button onClick={showNotification} className="p-2">
            <img src="/icons/imgi_3_videocam.png" alt="" width="24" height="24" />
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
                <img src="/icons/imgi_3_videocam.png" alt="" width="16" height="16" style={{ opacity: 0.6 }} />
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
                  <img src="/icons/imgi_3_videocam.png" alt="" width="12" height="12" />
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
                <img src="/icons/imgi_3_videocam.png" alt="" width="16" height="16" style={{ opacity: 0.6 }} />
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
                <img src="/icons/imgi_3_videocam.png" alt="" width="16" height="16" style={{ opacity: 0.6 }} />
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
                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#F9F9F9" strokeWidth="2" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"></path><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round"></line></svg>
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
                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#F9F9F9" strokeWidth="2" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"></path><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round"></line></svg>
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

      <div className="fixed bottom-0 left-0 right-0 bg-[#000] border-t border-white/10 px-3 py-2">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <button onClick={showNotification} className="flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" xmlns="http://www.w3.org/2000/svg"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          
          <div 
            className="flex-1 bg-transparent border border-white/20 rounded-full px-4 py-2 flex items-center cursor-pointer"
            onClick={showNotification}
          >
            <span className="text-white/40 text-[14px]">Mensagem...</span>
          </div>
          
          <div className="flex items-center gap-0.5">
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_5_mic.png" alt="" width="24" height="24" style={{ filter: 'brightness(0) invert(1)' }} />
            </button>
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_6_gallery.png" alt="" width="24" height="24" style={{ filter: 'brightness(0) invert(1)' }} />
            </button>
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_7_emoji.png" alt="" width="24" height="24" style={{ filter: 'brightness(0) invert(1)' }} />
            </button>
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_8_heart.png" alt="" width="24" height="24" style={{ filter: 'brightness(0) invert(1)' }} />
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
