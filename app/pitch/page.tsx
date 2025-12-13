'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const urlUsername = searchParams.get('username') || '';
  const searchParamsString = searchParams.toString();
  
  const [username, setUsername] = useState(urlUsername);
  
  useEffect(() => {
    if (urlUsername) {
      sessionStorage.setItem('pitch_username', urlUsername);
      setUsername(urlUsername);
    } else {
      const storedUsername = sessionStorage.getItem('pitch_username');
      if (storedUsername) {
        const params = new URLSearchParams(searchParamsString);
        params.set('username', storedUsername);
        router.replace(`/pitch?${params.toString()}`);
        setUsername(storedUsername);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUsername]);
  
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

  const purchaseLink39 = appendUtmToLink('https://pay.kiwify.com/cD8kCru');
  const purchaseLink59 = appendUtmToLink('https://pay.kiwify.com/HcxVBXX');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const testimonials = [
    { id: 1, avatar: '', name: 'María****', time: '3h', text: 'Tenía sospechas, pero no estaba segura... Cuando pagué la versión completa vi los DMs y los stories ocultos, me quedé sin piso. Pero al menos supe la verdad.' },
    { id: 2, avatar: '', name: 'Carlos****', time: '5h', text: 'Lo usé en el insta de una chica con la que salía y vi que estaba con otro hace meses. La herramienta me dio paz.', hasLock: true },
    { id: 3, avatar: '', name: 'Amanda****', time: '1d', text: 'Pensé que era falso al principio. En la versión completa probé con el @ de mi novio y vi un montón de cosas jaja. Ubicación, fotos ocultas, hasta conversaciones borradas.' },
    { id: 4, avatar: '', name: 'Pedro****', time: '5d', text: 'la función de ver la ubicación en tiempo real es muy buena jaja', hasLock: true },
    { id: 5, avatar: '', name: 'Julia****', time: '3 sem', text: 'no vivo sin esta herramienta, la conocí hace unos meses en tiktok y hasta hoy la uso en algunos perfiles sospechosos' },
    { id: 6, avatar: '', name: 'Lucas****', time: '2 sem', text: 'No lo recomiendo para quienes no quieren ver la verdad.' },
  ];

  const faqs = [
    { q: '¿La herramienta realmente funciona?', a: 'Sí, IA Stalker utiliza tecnología avanzada para acceder a datos públicos y privados de perfiles de Instagram.' },
    { q: '¿La persona sabrá que espié su perfil?', a: 'No. IA Stalker opera de forma 100% invisible y anónima.' },
    { q: '¿Funciona en perfiles privados?', a: 'Sí, funciona en cualquier tipo de perfil, público o privado.' },
    { q: '¿Necesito instalar algo?', a: 'No. Todo el servicio funciona 100% online, directo desde el navegador.' },
    { q: '¿Cómo funciona la garantía?', a: 'Ofrecemos garantía de 30 días. Si no te gusta, te devolvemos el 100% de tu dinero.' },
    { q: '¿Cuánto tiempo tengo acceso?', a: 'El acceso es vitalicio. Una vez que compras, tienes acceso para siempre.' },
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
              <span>Tu Acceso Exclusivo Expira en:</span>
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
              La mayor herramienta de espionaje de perfiles
            </h1>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <p className="text-[#A0A0A0] text-sm text-center mb-4">Acceso completo al perfil de:</p>
            
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
                <p className="text-[#A0A0A0] text-sm">{profile?.name || 'Cargando...'}</p>
              </div>
            </div>

            <div className="flex justify-around py-3 border-y border-[#262626] mb-4">
              <div className="text-center">
                <p className="text-white font-bold">{profile?.posts || 0}</p>
                <p className="text-[#A0A0A0] text-xs">publicaciones</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{formatNumber(profile?.followers || 0)}</p>
                <p className="text-[#A0A0A0] text-xs">seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{formatNumber(profile?.following || 0)}</p>
                <p className="text-[#A0A0A0] text-xs">siguiendo</p>
              </div>
            </div>

            {profile?.bio && (
              <p className="text-[#C0C0C0] text-sm text-center mb-4">{profile.bio}</p>
            )}

            <div className="bg-[#00FF75] rounded-xl py-3 px-4">
              <p className="text-black text-center text-sm font-medium">
                Sin necesidad de contraseña. Sin dejar rastros. Sin que la persona lo sepa.
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
                <p className="text-white font-semibold text-sm">Todos los medios recibidos y enviados por @{username}</p>
                <p className="text-[#808080] text-xs mt-1">Fotos, videos y archivos intercambiados en los DMs</p>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden">
              <img 
                src="/midias-bloqueadas.png" 
                alt="Medios bloqueados" 
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
              <p className="text-white font-semibold text-base mb-1">Ubicación actual</p>
              <p className="text-[#808080] text-sm mb-4">@{username} está compartiendo</p>
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
                <p className="text-white font-semibold text-sm">Stories y posts ocultos</p>
                <p className="text-[#808080] text-xs mt-1">Contenido que @{username} ocultó</p>
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
                    <p className="text-[#808080] text-xs mt-3">Contenido restringido</p>
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
                <p className="text-white font-semibold text-sm">Mensajes privados de Instagram (DMs)</p>
                <p className="text-[#808080] text-xs mt-1">Todas las conversaciones de @{username}</p>
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
                  <p className="text-[#00FF75] text-xs">en línea</p>
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
                    <p className="text-white text-sm">Mensaje oculto</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%] blur-[4px]">
                    <p className="text-white text-sm">Respuesta oculta</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#962FBF] rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%] blur-[4px]">
                    <p className="text-white text-sm">Otro mensaje</p>
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
              Además del acceso al perfil de @{username} podrás tener acceso a la herramienta IA Stalker
            </h2>
            <p className="text-[#A0A0A0] text-center text-sm mb-6">
              De forma completa y vitalicia, es decir, espiar cuantos perfiles quieras, cuando quieras, para siempre.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#EB1C8F]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EB1C8F" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Buscar cuantos perfiles quieras.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00FF75]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Visualizar todos los datos con solo un clic.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#DFB313]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#DFB313">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Tener acceso vitalicio sin pagar mensualidad.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00FF75]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF75" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Sin instalar nada, servicio funciona en la nube.</p>
              </div>
            </div>

            <a 
              href={purchaseLink59}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#E53935] rounded-xl py-4 px-4 text-center"
            >
              <p className="text-white font-bold text-sm mb-1">SIN IA STALKER, NO VES NADA</p>
              <p className="text-white/80 text-xs">Es el que desbloquea los datos de @{username} de forma invisible</p>
            </a>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-[#0C1011] rounded-[22px] p-5 mb-6"
          >
            <h2 className="text-white text-center font-bold text-xl mb-6">
              ¡Ten el control de cualquier perfil en tus manos!
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#E53935">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Descubrir una infidelidad antes de que te hagan tonto</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EB1C8F" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Espiar a quien amas en silencio</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#DFB313">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Ver si alguien está hablando mal de ti a tus espaldas</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#00FF75">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">Proteger a tu familia, tu relación, tu paz</p>
              </div>
            </div>

            <div className="bg-[#E53935]/10 border border-[#E53935] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#E53935" className="flex-shrink-0">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <div>
                  <p className="text-white font-bold text-sm">Atención: Usa con Discernimiento</p>
                  <p className="text-[#A0A0A0] text-xs mt-1">Las informaciones reveladas pueden ser intensas y transformadoras. Esta herramienta expone la verdad desnuda y cruda.</p>
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
              Mira lo que dicen las personas que usan IA Stalker:
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
              <p className="text-white font-bold text-sm">Esta es la verdad cruda. Tú decides si quieres ver.</p>
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
                <span className="text-white">BLACK FRIDAY LIMITADO</span>
              </div>
            </div>

            <h2 className="text-black text-center font-bold text-2xl mb-1">ELIGE TU PLAN</h2>
            <p className="text-[#DFB313] text-center text-sm mb-6">POR TIEMPO LIMITADO</p>

            <div className="bg-[#0C1011] rounded-[22px] p-5 mb-4">
              <h3 className="text-white text-center font-bold text-lg mb-1">Acceso al Perfil</h3>
              <p className="text-[#808080] text-center text-xs mb-4">Acceso completo al perfil de @{username}</p>
              
              <p className="text-[#808080] text-center text-sm line-through mb-2">De: 130,00€</p>
              <div className="bg-[#1A1A1A] rounded-xl py-4 mb-4">
                <p className="text-white text-center text-3xl font-bold">9<span className="text-xl">,90€</span></p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acceso completo al perfil de @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Stories ocultos o publicados solo para mejores amigos</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acceso a medios (fotos y videos) recibidos y enviados por @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">DMs en tiempo real y DMs antiguos (hasta 18 meses atrás)</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Ubicación en tiempo real y lugares visitados frecuentemente</p>
                </div>
              </div>

              <a 
                href={purchaseLink39}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#2A3A4A] rounded-xl py-3 text-center text-white font-bold"
              >
                Elegir Plan
              </a>
            </div>

            <div className="bg-[#0C1011] rounded-[22px] p-5 border-2 border-[#00FF75] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#00FF75] text-black text-xs font-bold px-3 py-1 rounded-full">RECOMENDADO</span>
              </div>

              <h3 className="text-white text-center font-bold text-lg mb-1 mt-2">Herramienta IA Stalker</h3>
              <p className="text-[#808080] text-center text-xs mb-4">Acceso completo + Herramienta vitalicia</p>
              
              <p className="text-[#808080] text-center text-sm line-through mb-2">De: 200,00€</p>
              <div className="bg-[#00FF75] rounded-xl py-4 mb-4">
                <p className="text-black text-center text-3xl font-bold">19<span className="text-xl">,90€</span></p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acceso completo al perfil de @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Stories ocultos o publicados solo para mejores amigos</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Acceso a medios (fotos y videos) recibidos y enviados por @{username}</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">DMs en tiempo real y DMs antiguos (hasta 18 meses atrás)</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <p className="text-white text-sm">Ubicación en tiempo real y lugares visitados frecuentemente</p>
                </div>
              </div>

              <div className="border-t border-[#262626] pt-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Espiar cuantos perfiles quieras</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Acceso vitalicio</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF75" className="flex-shrink-0 mt-0.5">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <p className="text-white text-sm font-semibold">Sin mensualidades</p>
                  </div>
                </div>
              </div>

              <a 
                href={purchaseLink59}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#00FF75] rounded-xl py-3 text-center text-black font-bold"
              >
                Elegir Plan
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
                <p className="text-black text-xs">Acceso Vitalicio</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#0C1011] border border-[#262626] flex items-center justify-center mb-2 mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-black text-xs">Soporte 24/7</p>
              </div>
            </div>

            <p className="text-[#808080] text-center text-xs mb-6">
              🔒 Compra 100% Segura • Encriptación SSL
            </p>

            <div className="bg-[#00FF75] rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <div>
                  <p className="text-black font-bold">Garantía de 30 Días</p>
                  <p className="text-black/70 text-sm">¡Prueba sin riesgo! Si no te gusta, te devolvemos el 100% de tu dinero.</p>
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
            <h2 className="text-black text-center font-bold text-xl mb-6">Preguntas Frecuentes</h2>

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
