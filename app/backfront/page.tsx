'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function BackfrontPage() {
  const [timeLeft, setTimeLeft] = useState({ minutes: 4, seconds: 37 });
  const [showBlink, setShowBlink] = useState(true);
  const [sessionInfo, setSessionInfo] = useState({
    os: 'Carregando...',
    browser: 'Carregando...',
    datetime: 'Carregando...'
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;
    let os = 'Desconhecido';
    let browser = 'Desconhecido';
    
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Google Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg')) browser = 'Microsoft Edge';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';
    
    const now = new Date();
    const datetime = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    setSessionInfo({ os, browser, datetime });
  }, []);

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

    const blinkTimer = setInterval(() => {
      setShowBlink(prev => !prev);
    }, 500);

    return () => {
      clearInterval(timer);
      clearInterval(blinkTimer);
    };
  }, []);

  const purchaseLink = 'https://go.perfectpay.com.br/PPU38CQ3TAS';

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0b0b0d' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-[1px]"
            style={{
              left: `${12.5 * (i + 1)}%`,
              background: 'linear-gradient(180deg, transparent 0%, rgba(255,0,127,0.1) 30%, rgba(255,127,0,0.1) 70%, transparent 100%)',
              boxShadow: '0 0 15px rgba(255,0,127,0.15)'
            }}
          />
        ))}
      </div>

      <header 
        className="fixed top-0 left-0 right-0 z-50 h-[65px] flex items-center justify-between px-4"
        style={{ background: 'linear-gradient(90deg, #e61e25, #c2171b)' }}
      >
        <button className="p-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-white font-bold text-[15px]">
          Seu Acesso Exclusivo Expira em: {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <button className="p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <main className="relative z-10 pt-[85px] pb-10 px-4 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[22px] p-6"
          style={{
            background: '#111113',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff007f, #ff7f00)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <span className="text-xl font-bold">
              <span className="text-white">Deep</span>
              <span style={{ color: '#ff007f' }}>gram</span>
            </span>
          </div>

          <h1 
            className="text-center text-2xl font-bold mb-6"
            style={{ color: '#ff4d4d' }}
          >
            Alerta de Segurança
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-[16px] p-5 mb-6"
            style={{
              background: '#111113',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <p className="text-white text-sm mb-4 font-medium">Informações da sessão atual:</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,0,127,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff007f">
                    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ color: '#c7c7c7', fontSize: '12px' }}>Sistema Operacional</p>
                  <p className="text-white text-sm font-medium">{sessionInfo.os}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,127,0,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff7f00">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ color: '#c7c7c7', fontSize: '12px' }}>Navegador</p>
                  <p className="text-white text-sm font-medium">{sessionInfo.browser}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,77,77,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4d4d">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ color: '#c7c7c7', fontSize: '12px' }}>Data e Hora</p>
                  <p className="text-white text-sm font-medium">{sessionInfo.datetime}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <p className="text-center text-sm mb-6" style={{ color: '#c7c7c7' }}>
            Para continuar utilizando a plataforma, finalize sua validação abaixo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 rounded-[22px] p-6"
          style={{
            background: '#111113',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}
        >
          <h2 className="text-white text-xl font-bold text-center mb-2">
            Finalize a ativação
          </h2>
          <p className="text-center text-sm mb-6" style={{ color: '#c7c7c7' }}>
            Complete o processo para acessar todos os recursos.
          </p>

          <div className="text-center mb-6">
            <p style={{ color: '#c7c7c7', fontSize: '14px' }}>Valor único</p>
            <p className="text-white text-4xl font-bold mt-1">
              R$ 59<span className="text-2xl">,90</span>
            </p>
          </div>

          <div 
            className="rounded-xl py-4 px-6 mb-6 text-center"
            style={{ 
              background: 'rgba(230,30,37,0.2)',
              border: '1px solid rgba(230,30,37,0.3)'
            }}
          >
            <p className="text-white text-sm font-medium mb-1">Tempo restante:</p>
            <p 
              className="text-3xl font-bold"
              style={{ 
                color: '#ff4d4d',
                opacity: showBlink ? 1 : 0.7,
                transition: 'opacity 0.3s'
              }}
            >
              {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </p>
          </div>

          <a
            href={purchaseLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-xl text-center font-bold text-white text-lg relative overflow-hidden group"
            style={{
              background: 'linear-gradient(90deg, #ff007f, #ff7f00)',
              boxShadow: '0 4px 20px rgba(255,0,127,0.4)'
            }}
          >
            <span className="flex items-center justify-center gap-2">
              ADQUIRIR ACESSO
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </span>
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.2), transparent)',
                pointerEvents: 'none'
              }}
            />
          </a>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Processamento automático e seguro.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
