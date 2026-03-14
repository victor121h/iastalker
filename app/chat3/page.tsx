'use client';

import { Suspense } from 'react';
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

function Chat3Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification, barHeight } = useNotification();
  
  const username = searchParams.get('username') || 'kadualef';
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

  const censoredName = 'ana_co***';

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
            <span className="text-[#8E8E8E] text-[12px]">Online 22h ago</span>
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

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">Of all the things I did in life and regretted, getting involved with you is at the top</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">And to think I almost made it official</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Please {username}</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Let&apos;s be happy, we love each other</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">It&apos;s a waste to throw all this away</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">I would never subject myself to all this if the feeling wasn&apos;t at the top of my life.</p>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-[#8E8E8E] text-[11px] uppercase tracking-wider">OCT 22, 14:33</span>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="w-[170px] rounded-xl overflow-hidden cursor-pointer bg-[#111]" onClick={showNotification}>
              <div className="px-2 pt-2 pb-1">
                <span className="text-white text-[11px]">relacionamenen...</span>
              </div>
              <div className="relative h-[180px] bg-gradient-to-b from-[#2a4a6a]/50 to-[#1a2a40]/60 flex items-center justify-center" style={{ filter: 'blur(4px)' }}>
                <div className="w-full h-full bg-[#3a5a7a]/30" />
              </div>
              <div className="absolute flex items-center justify-center" style={{ marginTop: '-110px', marginLeft: '60px' }}>
                <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center" style={{ filter: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 12 14" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L12 7L0 14V0Z"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-[#8E8E8E] text-[11px] uppercase tracking-wider">NOV 3, 09:17</span>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Hey good afternoon</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">I know you&apos;re avoiding talking to me</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">But today marks one month since our last kiss</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#7C3AED] rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">On the 29th Monday I should be going to the <BlurredText text="gym" /> again</p>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-[#8E8E8E] text-[11px] uppercase tracking-wider">2 DAYS AGO, 18:45</span>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="w-[170px] rounded-xl overflow-hidden cursor-pointer bg-[#111]" onClick={showNotification}>
              <div className="px-2 pt-2 pb-1">
                <span className="text-white text-[11px]">sentimentos_div...</span>
              </div>
              <div className="relative h-[180px] bg-gradient-to-b from-[#6a3a3a]/50 to-[#3a1a20]/60 flex items-center justify-center" style={{ filter: 'blur(4px)' }}>
                <div className="w-full h-full bg-[#7a4a5a]/30" />
              </div>
              <div className="absolute flex items-center justify-center" style={{ marginTop: '-110px', marginLeft: '60px' }}>
                <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center" style={{ filter: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 12 14" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L12 7L0 14V0Z"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-[#8E8E8E] text-[11px] uppercase tracking-wider">YESTERDAY, 23:02</span>
          </div>

          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 h-[0.5px] bg-white/20"></div>
            <span className="text-[#8E8E8E] text-[11px]">New messages</span>
            <div className="flex-1 h-[0.5px] bg-white/20"></div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">{username}???</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
              <p className="text-white text-[15px]">Good morning.</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">Why don&apos;t you answer me anymore?????</p>
            </div>
          </div>

          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 self-end">
              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
              <p className="text-white text-[15px]">I&apos;m in the city and I wanted to see you</p>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#000] border-t border-white/10 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={showNotification} className="flex-shrink-0">
            <img src="/icons/imgi_4_camera.png" alt="" width="32" height="32" className="rounded-full" />
          </button>
          
          <div 
            className="flex-1 bg-transparent border border-white/20 rounded-full px-4 py-2 flex items-center cursor-pointer"
            onClick={showNotification}
          >
            <span className="text-white/40 text-[14px]">Mensagem...</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_5_mic.png" alt="" width="22" height="22" />
            </button>
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_6_gallery.png" alt="" width="22" height="22" />
            </button>
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_7_emoji.png" alt="" width="22" height="22" />
            </button>
            <button onClick={showNotification} className="p-1.5">
              <img src="/icons/imgi_8_heart.png" alt="" width="22" height="22" />
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
