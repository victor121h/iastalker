'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ChatMessage {
  id: number;
  text: string;
  time: string;
  isMe: boolean;
  delay: number;
}

function DetetiveContent() {
  const searchParams = useSearchParams();
  const [showDemo, setShowDemo] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [showFinalBanner, setShowFinalBanner] = useState(false);

  const chatMessages: ChatMessage[] = [
    { id: 1, text: 'Hi, we matched on Tinder', time: '23:42', isMe: true, delay: 500 },
    { id: 2, text: 'How are you?', time: '23:42', isMe: true, delay: 1200 },
    { id: 3, text: 'Hey good evening, better now', time: '23:44', isMe: false, delay: 2500 },
    { id: 4, text: 'You are so hot you know', time: '23:44', isMe: false, delay: 3800 },
    { id: 5, text: 'Haha thanks ❤️', time: '23:45', isMe: true, delay: 5200 },
    { id: 6, text: 'I can\'t have you over at my place', time: '23:46', isMe: false, delay: 6800 },
    { id: 7, text: 'Wanna go to a hotel?? I\'ll pay', time: '23:46', isMe: false, delay: 8200 },
    { id: 8, text: 'Well, I would be down, but there\'s just one problem...', time: '23:47', isMe: true, delay: 10000 },
    { id: 9, text: 'Actually my name is Mike, I\'m a private investigator from IA Observer 🔍', time: '23:47', isMe: true, delay: 12000 },
    { id: 10, text: 'And I was hired by your partner to test your loyalty', time: '23:48', isMe: true, delay: 14000 },
    { id: 11, text: 'And you failed ❌❌❌', time: '23:48', isMe: true, delay: 16000 },
  ];

  useEffect(() => {
    if (showDemo) {
      setVisibleMessages([]);
      setShowFinalBanner(false);
      
      chatMessages.forEach((msg) => {
        setTimeout(() => {
          setVisibleMessages(prev => [...prev, msg.id]);
        }, msg.delay);
      });

      setTimeout(() => {
        setShowFinalBanner(true);
      }, 17500);
    } else {
      setVisibleMessages([]);
      setShowFinalBanner(false);
    }
  }, [showDemo]);

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

  const steps = [
    {
      number: 1,
      title: 'Initial Briefing',
      description: 'You provide all target information: full name, social media, phone number, habits, schedules. The more details, the better the investigation.'
    },
    {
      number: 2,
      title: 'Immediate Start',
      description: 'The investigation starts IMMEDIATELY after hiring. The detective analyzes the profile, builds the strategy and initiates contact right away.'
    },
    {
      number: 3,
      title: 'Infiltration and Approach',
      description: 'The detective creates a convincing fake profile and adds the target on social media, approaching their social circle.'
    },
    {
      number: 4,
      title: 'Building Trust',
      description: 'They maintain natural conversations, comment on photos and use persuasion techniques to gain trust.'
    },
    {
      number: 5,
      title: 'Loyalty Test',
      description: 'With trust established, the detective applies subtle tests to measure loyalty.'
    },
    {
      number: 6,
      title: 'Evidence Collection',
      description: 'All relevant interactions are recorded with screenshots, audio and video.'
    },
    {
      number: 7,
      title: 'Complete Final Report',
      description: 'You receive a PDF report with all evidence and complete behavioral analysis.'
    }
  ];

  const features = [
    { icon: '👤', title: 'Real Detective', subtitle: 'Experienced professional' },
    { icon: '💬', title: 'WhatsApp 24/7', subtitle: 'Direct support' },
    { icon: '📄', title: 'PDF Report', subtitle: 'Complete document' },
    { icon: '👁️', title: 'Real-Time Updates', subtitle: 'Follow everything' },
    { icon: '📸', title: 'Screenshots & Proof', subtitle: 'Clear evidence' },
    { icon: '✓', title: 'Complete Analysis', subtitle: 'Detailed behavior' }
  ];

  const masterProFeatures = [
    'Actor/Actress from a city near you for in-person meeting',
    'Real-world loyalty test with physical encounter',
    'Discreet video recording of the meeting as definitive proof',
    'Trained and experienced professionals in in-person investigation',
    'Detailed report with photos, videos and complete behavioral analysis',
    'Real-time monitoring and updates via WhatsApp',
    'Maximum guarantee of success and irrefutable proof'
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-[#1a1a2e] rounded-2xl flex items-center justify-center border border-gray-700">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h1 className="text-white text-2xl font-bold mb-2">
            Professional Private Investigator
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Real Investigation with Real People
          </p>

          <div className="flex justify-center gap-3 mb-6">
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ● Real Investigation
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-gray-700/50 text-gray-300 border border-gray-600">
              🔒 100% Confidential
            </span>
          </div>

          <div className="bg-[#1a1a2e] rounded-xl py-3 px-6 inline-flex items-center gap-2 border border-gray-700">
            <span className="text-purple-400">💎</span>
            <span className="text-white font-medium text-sm">Our Most Complete and Professional Service</span>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl">⚡</span>
            <h2 className="text-white font-bold text-lg">How the Investigation Works</h2>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm border border-gray-700">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl py-3 px-4 flex items-center justify-center gap-2">
            <span className="text-lg">📱</span>
            <span className="text-emerald-400 text-sm font-medium">You follow everything via the detective's WhatsApp in real time</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl">🔍</span>
            <h2 className="text-white font-bold text-lg">See How It Works in Practice</h2>
          </div>
          <p className="text-gray-400 text-sm text-center mb-6">Real example of professional infiltration</p>

          <div className="relative mx-auto" style={{ maxWidth: '280px' }}>
            <div className="bg-[#1a1a2e] rounded-[32px] p-3 border-4 border-gray-700">
              <div className="bg-[#e5ddd5] rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16' }}>
                <div className="bg-[#075e54] py-2 px-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-xs">🔍</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">Investigation Tip</p>
                    <p className="text-white/70 text-[10px]">online</p>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col items-center justify-center" style={{ minHeight: '200px' }}>
                  <button
                    onClick={() => setShowDemo(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
                  >
                    <span>📱</span>
                    Click to see the demo
                  </button>
                  <p className="text-gray-600 text-xs mt-3 text-center">See how the detective works in practice</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-xl py-3 px-4 text-center">
            <span className="text-purple-400 text-sm">
              <strong>Professional technique:</strong> The detective uses a convincing fake profile and applies psychology to test the target's loyalty
            </span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-white font-bold text-xl text-center mb-2">What's Included</h2>
          <p className="text-gray-400 text-sm text-center mb-6">Everything you need to discover the truth</p>

          <div className="grid grid-cols-3 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="bg-[#12121a] rounded-xl p-4 text-center border border-gray-800"
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <h3 className="text-white font-semibold text-xs mb-1">{feature.title}</h3>
                <p className="text-gray-500 text-[10px]">{feature.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="text-white font-bold text-lg">How Does It Work?</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
              IMMEDIATE START
            </span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-400">✅</span>
              <span className="text-emerald-400 font-bold text-sm">Investigation Starts NOW</span>
            </div>
            <p className="text-gray-400 text-xs">
              As soon as you hire, the detective contacts you to collect information about your partner and <strong className="text-white">starts immediately</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="text-white font-semibold text-sm">Purchased? Detective calls you NOW</h3>
                <p className="text-gray-500 text-xs">Collects partner data and starts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="text-white font-semibold text-sm">You receive constant updates</h3>
                <p className="text-gray-500 text-xs">Direct WhatsApp with detective 24/7</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="text-white font-semibold text-sm">You decide when to stop</h3>
                <p className="text-gray-500 text-xs">Continue until you have ALL the answers</p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-red-400 text-xs">↑ The investigation lasts until you're 100% satisfied</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-6 mb-6 border-2 border-amber-500/50"
          style={{ background: 'linear-gradient(180deg, rgba(180, 130, 50, 0.1) 0%, rgba(10, 10, 15, 1) 100%)' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">Master PRO Investigation</h3>
              <p className="text-gray-400 text-sm">Real Meeting in Your City</p>
            </div>
            <div className="text-right">
              <span className="text-amber-400 text-xs font-bold bg-amber-500/20 px-2 py-1 rounded">VIP</span>
              <p className="text-amber-400 text-3xl font-bold mt-1"><span className="text-xl">$</span>47</p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl py-2 px-4 text-center mb-4 border border-gray-700">
            <span className="text-amber-400 text-sm">✦ Everything from Advanced Investigation +</span>
          </div>

          <div className="space-y-3 mb-6">
            {masterProFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-amber-400 text-sm">✓</span>
                <span className="text-white text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl py-3 px-4 text-center mb-4">
            <p className="text-amber-400 text-sm font-medium">🏆 Most complete investigation.</p>
            <p className="text-amber-400 text-xs">For absolute certainty!</p>
          </div>

          <a
            href={appendUtmToLink('https://go.centerpag.com/PPU38CQ6IMC')}
            className="block w-full py-4 rounded-xl text-center font-bold text-black bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition-all"
          >
            Hire Master PRO Investigation
          </a>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center py-8"
        >
          <p className="text-gray-500 text-xs">
            © 2024 IA Observer - All rights reserved
          </p>
        </motion.section>
      </div>

      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" 
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#1a1a2e] rounded-[40px] p-3 border-4 border-gray-700 shadow-2xl">
                <div className="bg-[#e5ddd5] rounded-[28px] overflow-hidden" style={{ maxHeight: '70vh' }}>
                  <div className="bg-[#075e54] py-3 px-4 flex items-center gap-3">
                    <button onClick={() => setShowDemo(false)} className="text-white">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                      </svg>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#888">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">Investigation Target</p>
                      <p className="text-white/70 text-xs">online</p>
                    </div>
                  </div>
                  
                  <div 
                    className="p-3 space-y-2 overflow-y-auto"
                    style={{ 
                      minHeight: '400px',
                      maxHeight: '50vh',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c4b998\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                      backgroundColor: '#e5ddd5'
                    }}
                  >
                    {chatMessages.map((msg) => (
                      <AnimatePresence key={msg.id}>
                        {visibleMessages.includes(msg.id) && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                            className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${
                                msg.isMe 
                                  ? 'bg-[#dcf8c6] rounded-tr-none' 
                                  : 'bg-white rounded-tl-none'
                              }`}
                            >
                              <p className="text-gray-800 text-sm">{msg.text}</p>
                              <p className="text-gray-500 text-[10px] text-right mt-1">{msg.time}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>

                  <AnimatePresence>
                    {showFinalBanner && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-red-500 to-red-600 py-3 px-4"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-white text-lg">⚠️</span>
                          <div className="text-center">
                            <p className="text-white font-bold text-sm">INFIDELITY CONFIRMED</p>
                            <p className="text-white/90 text-xs">Evidence sent to you immediately</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 18 }}
                onClick={() => setShowDemo(false)}
                className="w-full mt-4 py-3 rounded-xl bg-emerald-500 text-white font-bold"
              >
                Close demo
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DetetivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <DetetiveContent />
    </Suspense>
  );
}
