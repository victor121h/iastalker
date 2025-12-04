'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Step = 'input' | 'syncing' | 'locked';

interface SyncStep {
  id: number;
  text: string;
  completed: boolean;
  active: boolean;
}

function Up2Content() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('input');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('Carregando...');
  const [showPopup, setShowPopup] = useState(false);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([
    { id: 1, text: 'Localizando dispositivo alvo...', completed: false, active: false },
    { id: 2, text: 'Estabelecendo conexão segura...', completed: false, active: false },
    { id: 3, text: 'Acessando câmera e microfone...', completed: false, active: false },
    { id: 4, text: 'Sincronização completa!', completed: false, active: false },
  ]);

  useEffect(() => {
    fetch('/api/geolocation')
      .then(res => res.json())
      .then(data => {
        if (data.location) {
          setLocation(data.location);
        } else {
          setLocation('São Paulo, SP');
        }
      })
      .catch(() => setLocation('São Paulo, SP'));
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

  const handleSubmit = () => {
    if (!username.trim()) return;
    setStep('syncing');
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < 4) {
        setSyncSteps(prev => prev.map((s, i) => ({
          ...s,
          active: i === currentStep,
          completed: i < currentStep
        })));
        currentStep++;
      } else {
        clearInterval(interval);
        setSyncSteps(prev => prev.map(s => ({ ...s, completed: true, active: false })));
        setTimeout(() => setStep('locked'), 1000);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 px-4 py-8 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E53935, #FF6B35)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold" style={{ background: 'linear-gradient(90deg, #E53935, #FF6B35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              OLHO OCULTO
            </h1>
          </div>
          <p className="text-[#E53935] text-sm font-medium">A nova era da vigilância silenciosa começou.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <p className="text-white text-lg leading-relaxed mb-6">
            Você já imaginou acessar a câmera e o microfone de qualquer celular digitando apenas o @ do Instagram?
          </p>

          <div className="space-y-3 text-left max-w-xs mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <span className="text-[#A0A0A0] text-sm">Nada de número de telefone.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <span className="text-[#A0A0A0] text-sm">Nada de instalar nada no aparelho-alvo.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🔮</span>
              <span className="text-[#A0A0A0] text-sm">Zero rastros. Zero notificações.</span>
            </div>
          </div>
        </motion.div>

        {step === 'input' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#111] rounded-2xl p-6 border border-[#222]"
          >
            <h2 className="text-white text-xl font-bold text-center mb-6">COMO FUNCIONA?</h2>
            
            <p className="text-[#888] text-sm mb-3">1. Digite o @ da vítima:</p>
            
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace('@', ''))}
              placeholder="@usuario_alvo"
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-[#555] focus:outline-none focus:border-[#E53935] transition-colors mb-4"
            />

            <button
              onClick={handleSubmit}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #E53935, #EB1C8F)' }}
            >
              🔍 CONFIRMAR E INICIAR ACESSO
            </button>
          </motion.div>
        )}

        {step === 'syncing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111] rounded-2xl p-6 border border-[#222]"
          >
            <h2 className="text-white text-lg font-bold text-center mb-6">2. Aguarde a sincronização oculta...</h2>
            
            <div className="border border-[#E53935] rounded-xl p-4 mb-6">
              <p className="text-[#E53935] text-xl font-bold text-center">@{username}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-[#00FF75]">✓</span>
                <span className="text-[#00FF75] text-sm font-medium">Alvo confirmado</span>
              </div>
            </div>

            <p className="text-[#888] text-sm text-center mb-4">Localizando dispositivo alvo...</p>

            <div className="space-y-3">
              {syncSteps.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.completed ? 'bg-[#00FF75] text-black' : 
                    s.active ? 'bg-[#FF6B35] text-white' : 
                    'bg-[#333] text-[#666]'
                  }`}>
                    {s.completed ? '✓' : s.id}
                  </div>
                  <span className={`text-sm ${
                    s.completed ? 'text-[#00FF75]' : 
                    s.active ? 'text-white' : 
                    'text-[#666]'
                  }`}>
                    {s.text}
                    {s.active && <span className="animate-pulse">...</span>}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'locked' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-white text-lg font-bold text-center mb-6">3. Veja e ouça tudo — em tempo real</h2>
            
            <div className="bg-[#111] rounded-2xl p-4 border border-[#222] mb-4">
              <div className="text-[#888] text-xs mb-2">1.00</div>
              <div className="aspect-video bg-[#0A0A0A] rounded-xl flex items-center justify-center mb-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]" />
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35" className="relative z-10">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00FF75]">📸</span>
                <span className="text-[#00FF75] text-sm">Câmera Ativa agora em <span className="font-bold">{location}</span></span>
              </div>
            </div>

            <div className="bg-[#111] rounded-2xl p-4 border border-[#222] mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#E53935]">🎤</span>
                <span className="text-[#E53935] text-sm">Áudio ao vivo capturado - <span className="font-bold">{location}</span></span>
              </div>
              <div className="flex items-center justify-center gap-1 h-16">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-[#E53935] rounded-full"
                    animate={{
                      height: [8, Math.random() * 40 + 10, 8],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[#888] text-sm mb-4">
              <span className="text-yellow-500">⚠</span>
              <span>Conteúdo bloqueado - Libere o acesso completo abaixo</span>
            </div>

            <button
              onClick={() => setShowPopup(true)}
              className="block w-full py-4 rounded-xl font-bold text-black text-lg text-center bg-[#00FF75] hover:bg-[#00DD65] transition-colors"
            >
              🔓 LIBERAR ACESSO DA CÂMERA E ÁUDIO
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-[#444] text-xs">Acesso 100% anônimo e seguro</p>
        </motion.div>
      </div>

      {showPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPopup(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#0D0D0D] rounded-2xl p-6 border border-[#E53935]/30"
            style={{ boxShadow: '0 0 60px rgba(229, 57, 53, 0.2)' }}
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🔒</span>
                <h2 className="text-white text-xl font-bold">QUEM USA, SABE. QUEM DUVIDA, SOME.</h2>
              </div>
              <p className="text-[#888] text-sm">Esse sistema é exclusivo. Só alguns têm. E quem tem... não fala.</p>
            </div>

            <div className="border border-[#E53935] rounded-xl p-4 mb-6 bg-[#1A0A0A]">
              <p className="text-[#CCC] text-sm italic">
                "Usei num perfil que me bloqueou. Em menos de 1 minuto, tava ouvindo a sala toda." — <span className="text-[#E53935]">Depoimento real</span>
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🔐</span>
                <span className="text-white font-bold">QUANTO VALE TER O PODER NAS MÃOS?</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span>🖤</span>
                  <span className="text-[#A0A0A0] text-sm">Acesso limitado</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>💉</span>
                  <span className="text-[#A0A0A0] text-sm">Compra única</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🚫</span>
                  <span className="text-[#A0A0A0] text-sm">Sem mensalidade. Sem perguntas.</span>
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-[#666] text-sm line-through mb-2">DE R$ 100</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">👉</span>
                <span className="text-3xl font-bold" style={{ color: '#EB1C8F' }}>POR APENAS R$ 17,00</span>
              </div>
              <p className="text-[#888] text-xs mt-2">Oferta válida enquanto os acessos não forem bloqueados.</p>
            </div>

            <a
              href={appendUtmToLink("https://go.perfectpay.com.br/PPU38CQ3TGJ")}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 rounded-xl font-bold text-white text-lg text-center mb-4 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #E53935, #EB1C8F)' }}
            >
              🔥 LIBERAR ACESSO AGORA 🔥
            </a>

            <div className="text-center">
              <p className="text-[#666] text-xs">Você não vai achar isso duas vezes.</p>
              <p className="text-[#888] text-xs">Ou entra… ou é só mais um curioso.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function Up2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><div className="text-white">Carregando...</div></div>}>
      <Up2Content />
    </Suspense>
  );
}
