'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MatrixBackground from '@/components/MatrixBackground';

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
  const username = searchParams.get('username') || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [timeLeft, setTimeLeft] = useState({ minutes: 4, seconds: 52 });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    document.cookie = 'deepgram_visited=true; path=/; max-age=31536000';
  }, []);

  useEffect(() => {
    if (username) {
      fetch(`/api/instagram?username=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => setProfile(data))
        .catch(console.error);
    }
  }, [username]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const purchaseLink39 = appendUtmToLink('https://go.perfectpay.com.br/PPU38CQ3TAS');
  const purchaseLink59 = appendUtmToLink('https://go.perfectpay.com.br/PPU38CQ3TCI');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const testimonials = [
    { id: 1, avatar: '', name: 'Maria****', time: '3h', text: 'Eu tava desconfiando, mas não tinha certeza... Quando paguei a versão completa vi os directs e os stories escondidos fiquei sem chão. Mas pelo menos eu soube a verdade.' },
    { id: 2, avatar: '', name: 'Carlos****', time: '5h', text: 'Usei no insta de uma ficante minha vi que ele tava com outro há meses. A ferramenta me deu paz.', hasLock: true },
    { id: 3, avatar: '', name: 'Amanda****', time: '1d', text: 'Achei que era fake no começo. na versão completa eu testei com @ do boy e vi um monte de coisa kkkkk. Localização, fotos escondidas, até conversas apagadas.' },
    { id: 4, avatar: '', name: 'Pedro****', time: '5d', text: 'a função de ver a localização em tempo real é muito bom kkkkk', hasLock: true },
    { id: 5, avatar: '', name: 'Julia****', time: '3 sem', text: 'não vivo sem essa ferramenta, conheci ela uns meses atrás no tiktok e até hoje uso em alguns perfis que to desconfiado' },
    { id: 6, avatar: '', name: 'Lucas****', time: '2 sem', text: 'Não recomendo pra quem não quer ver a verdade.' },
  ];

  const faqs = [
    { q: 'A ferramenta realmente funciona?', a: 'Sim, o IA Stalker utiliza tecnologia avançada para acessar dados públicos e privados de perfis do Instagram.' },
    { q: 'A pessoa vai saber que eu stalkeei o perfil dela?', a: 'Não. O IA Stalker opera de forma 100% invisível e anônima.' },
    { q: 'Funciona em perfis privados?', a: 'Sim, funciona em qualquer tipo de perfil, público ou privado.' },
    { q: 'Preciso instalar alguma coisa?', a: 'Não. Todo o serviço funciona 100% online, direto pelo navegador.' },
    { q: 'Como funciona a garantia?', a: 'Oferecemos garantia de 30 dias. Se não gostar, devolvemos 100% do seu dinheiro.' },
    { q: 'Quanto tempo tenho acesso?', a: 'O acesso é vitalício. Uma vez que você compra, tem acesso para sempre.' },
  ];

  return (
    <div className="min-h-screen bg-white relative">
      <MatrixBackground />
      
      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#E53935] py-2.5 px-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button className="p-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <span>Seu Acesso Exclusivo Expira em:</span>
              <span className="font-bold">
                {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
            <div className="w-5" />
          </div>
        </header>

        <main className="pt-16 pb-8 px-4 max-w-md mx-auto">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="flex items-center justify-center mb-4">
              <img src="/logo-deepgram-header.png" alt="IA Stalker" className="h-[48px] w-auto" />
            </div>
            <h1 className="text-black text-xl font-bold leading-tight">
              A maior ferramenta de stalkear do Brasil
            </h1>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <p className="text-[#A0A0A0] text-sm text-center mb-4">Acesso completo ao perfil de:</p>
            
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
                <p className="text-[#A0A0A0] text-sm">{profile?.name || 'Carregando...'}</p>
              </div>
            </div>

            <div className="flex justify-around py-3 border-y border-[#262626] mb-4">
              <div className="text-center">
                <p className="text-white font-bold">{profile?.posts || 0}</p>
                <p className="text-[#A0A0A0] text-xs">posts</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{formatNumber(profile?.followers || 0)}</p>
                <p className="text-[#A0A0A0] text-xs">seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{formatNumber(profile?.following || 0)}</p>
                <p className="text-[#A0A0A0] text-xs">seguindo</p>
              </div>
            </div>

            {profile?.bio && (
              <p className="text-[#C0C0C0] text-sm text-center mb-4">{profile.bio}</p>
            )}

            <div className="bg-[#00FF75] rounded-xl py-3 px-4">
              <p className="text-black text-center text-sm font-medium">
                Sem precisar de senha. Sem deixar rastros. Sem que a pessoa saiba.
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
                <p className="text-white font-semibold text-sm">Todas as mídias recebidas e enviadas por @{username}</p>
                <p className="text-[#808080] text-xs mt-1">Fotos, vídeos e arquivos trocados nos directs</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-square bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#666">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                  </svg>
                </div>
              ))}
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
              <p className="text-white font-semibold text-base mb-1">Localização atual</p>
              <p className="text-[#808080] text-sm mb-4">@{username} está compartilhando</p>
              <button className="bg-[#2a3a4a] hover:bg-[#3a4a5a] text-white font-medium py-2.5 px-12 rounded-lg transition-colors">
                Ver
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
                <p className="text-white font-semibold text-sm">Stories e posts ocultos</p>
                <p className="text-[#808080] text-xs mt-1">Conteúdo que @{username} escondeu</p>
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
                    <p className="text-[#808080] text-xs mt-3">Conteúdo restrito</p>
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
                <p className="text-white font-semibold text-sm">Mensagens privadas do Instagram (Directs)</p>
                <p className="text-[#808080] text-xs mt-1">Todas as conversas de @{username}</p>
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
                    <p className="text-white text-sm">Mensagem oculta</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%] blur-[4px]">
                    <p className="text-white text-sm">Resposta oculta</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#962FBF] rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%] blur-[4px]">
                    <p className="text-white text-sm">Outra mensagem</p>
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
              <img src="/logo-deepgram-header.png" alt="IA Stalker" className="h-[36px] w-auto" />
            </div>

            <h2 className="text-white text-center font-bold text-lg mb-2">
              Além do acesso ao perfil de @{username} você poderá ter acesso a ferramenta do IA Stalker
            </h2>
            <p className="text-[#A0A0A0] text-center text-sm mb-6">
              De forma completa e vitalícia, ou seja, stalkear quantos perfis quiser, quando quiser pra sempre.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#EB1C8F]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EB1C8F" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Pesquisar quantos perfis quiser.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00FF75]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Visualizar todos os dados com apenas um clique.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#DFB313]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#DFB313">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Ter acesso vitalício sem pagar mensalidade.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00FF75]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Sem instalar nada, serviço funciona na nuvem.</p>
              </div>
            </div>

            <a 
              href={purchaseLink59}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#E53935] rounded-xl py-4 px-4 text-center"
            >
              <p className="text-white font-bold text-sm mb-1">SEM O IA STALKER, VOCÊ NÃO VÊ NADA</p>
              <p className="text-white/80 text-xs">É ele quem desbloqueia os dados de @{username} de forma invisível</p>
            </a>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <h2 className="text-white text-center font-bold text-xl mb-6">
              Tenha o controle de qualquer perfil em suas mãos!
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#E53935">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Descobrir uma traição antes de ser feita de trouxa</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EB1C8F" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Espionar quem você ama em silêncio</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#DFB313">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Ver se alguém tá falando mal de você pelas costas</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#00FF75">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Proteger sua família, sua relação, sua paz</p>
              </div>
            </div>

            <div className="bg-[#E53935]/10 border border-[#E53935] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#E53935" className="flex-shrink-0">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <div>
                  <p className="text-white font-bold text-sm">Atenção: Use Com Discernimento</p>
                  <p className="text-[#A0A0A0] text-xs mt-1">As informações reveladas podem ser intensas e transformadoras. Esta ferramenta expõe a verdade nua e crua.</p>
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
              Veja o que falam as pessoas que usam o IA Stalker:
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
              <p className="text-white font-bold text-sm">Essa é a verdade crua. Você decide se quer ver.</p>
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
                <span className="text-white">BLACK FRIDAY LIMITADA</span>
              </div>
            </div>

            <h2 className="text-black text-center font-bold text-2xl mb-1">ESCOLHA SEU PLANO</h2>
            <p className="text-[#DFB313] text-center text-sm mb-6">POR TEMPO LIMITADO</p>

            <div className="bg-[#0C1011] rounded-[22px] p-5 mb-4">
              <h3 className="text-white text-center font-bold text-lg mb-1">Acesso ao Perfil</h3>
              <p className="text-[#808080] text-center text-xs mb-4">Acesso completo ao perfil de @{username}</p>
              
              <p className="text-[#808080] text-center text-sm line-through mb-2">De: R$ 130,00</p>
              <div className="bg-[#1A1A1A] rounded-xl py-4 mb-4">
                <p className="text-white text-center text-3xl font-bold">R$ 49<span className="text-xl">,90</span></p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acesso completo ao perfil de @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Stories ocultos ou postados apenas para melhores amigos</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acesso a mídia (fotos e vídeos) recebidos e enviados por @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Directs em tempo real e directs antigos (até 18 meses atrás)</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Localização em tempo real e locais visitados frequentes</p>
                </div>
              </div>

              <a 
                href={purchaseLink39}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#2A3A4A] rounded-xl py-3 text-center text-white font-bold"
              >
                Escolher Plano
              </a>
            </div>

            <div className="bg-[#0C1011] rounded-[22px] p-5 border-2 border-[#00FF75] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#00FF75] text-black text-xs font-bold px-3 py-1 rounded-full">RECOMENDADO</span>
              </div>

              <h3 className="text-white text-center font-bold text-lg mb-1 mt-2">Ferramenta IA Stalker</h3>
              <p className="text-[#808080] text-center text-xs mb-4">Acesso completo + Ferramenta vitalícia</p>
              
              <p className="text-[#808080] text-center text-sm line-through mb-2">De: R$ 200,00</p>
              <div className="bg-[#00FF75] rounded-xl py-4 mb-4">
                <p className="text-black text-center text-3xl font-bold">R$ 59<span className="text-xl">,90</span></p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acesso completo ao perfil de @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Stories ocultos ou postados apenas para melhores amigos</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acesso a mídia (fotos e vídeos) recebidos e enviados por @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Directs em tempo real e directs antigos (até 18 meses atrás)</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Localização em tempo real e locais visitados frequentes</p>
                </div>
              </div>

              <div className="border-t border-[#262626] pt-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Stalkear quantos perfis quiser</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Acesso vitalício</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Sem mensalidades</p>
                  </div>
                </div>
              </div>

              <a 
                href={purchaseLink59}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#00FF75] rounded-xl py-3 text-center text-black font-bold"
              >
                Escolher Plano
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
                <p className="text-black text-xs">Acesso Vitalício</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#0C1011] border border-[#262626] flex items-center justify-center mb-2 mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-black text-xs">Suporte 24/7</p>
              </div>
            </div>

            <p className="text-[#808080] text-center text-xs mb-6">
              🔒 Compra 100% Segura • Criptografia SSL
            </p>

            <div className="bg-[#00FF75] rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <div>
                  <p className="text-black font-bold">Garantia de 30 Dias</p>
                  <p className="text-black/70 text-sm">Teste sem risco! Se não gostar, devolvemos 100% do seu dinheiro.</p>
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
            <h2 className="text-black text-center font-bold text-xl mb-6">Perguntas Frequentes</h2>

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

export default function PitchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000]" />}>
      <PitchContent />
    </Suspense>
  );
}
