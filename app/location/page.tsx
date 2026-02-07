'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Stage = 'intro' | 'tracking' | 'results';

interface LocationData {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  location: string;
}

function LocationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>('intro');
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showNoCreditsPopup, setShowNoCreditsPopup] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const appendUtmToPath = (basePath: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      return `${basePath}?${utmParams}`;
    }
    return basePath;
  };

  useEffect(() => {
    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) {
      setUserEmail(storedEmail);
      fetch(`/api/credits?email=${encodeURIComponent(storedEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.available !== undefined) {
            setCurrentCredits(data.available);
          }
        })
        .catch(() => {});
    }

    fetch('/api/geolocation')
      .then(res => res.json())
      .then(data => {
        setLocationData(data);
      })
      .catch(() => {});
  }, []);

  const trackingSteps = [
    'Starting tracking...',
    'Connecting to target device...',
    'Mapping frequent locations...',
    'Identifying suspicious spots...',
    'Analyzing movement patterns...',
    'Generating location report...',
  ];

  const handleStartTracking = () => {
    setStage('tracking');
    setProgress(0);
    setCurrentStepIndex(0);

    let prog = 0;
    let stepIdx = 0;
    progressInterval.current = setInterval(() => {
      prog += 0.4;

      if (prog >= 10 && stepIdx < 1) stepIdx = 1;
      if (prog >= 25 && stepIdx < 2) stepIdx = 2;
      if (prog >= 45 && stepIdx < 3) stepIdx = 3;
      if (prog >= 65 && stepIdx < 4) stepIdx = 4;
      if (prog >= 85 && stepIdx < 5) stepIdx = 5;

      if (prog >= 100) {
        prog = 100;
        if (progressInterval.current) clearInterval(progressInterval.current);
        setTimeout(() => setStage('results'), 600);
      }

      setProgress(prog);
      setCurrentStepIndex(stepIdx);
    }, 100);
  };

  const handleAccelerate = async () => {
    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentCredits(data.available);
        if (progressInterval.current) clearInterval(progressInterval.current);
        setProgress(100);
        setCurrentStepIndex(5);
        setTimeout(() => setStage('results'), 800);
      } else {
        setShowNoCreditsPopup(true);
      }
    } catch {
      setShowNoCreditsPopup(true);
    }
  };

  const handleActivateRealTime = async () => {
    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: 40 }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentCredits(data.available);
      } else {
        setShowNoCreditsPopup(true);
      }
    } catch {
      setShowNoCreditsPopup(true);
    }
  };

  const handleDeleteInvestigation = () => {
    router.push(appendUtmToPath('/dashboard'));
  };

  const handleBuyCredits = () => {
    router.push(appendUtmToPath('/buy'));
  };

  const cityName = locationData?.city || 'Unknown';
  const stateName = locationData?.state || '';
  const locationDisplay = locationData?.location || 'Detecting...';

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-6"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">See where your spouse goes.</h1>
                    <p className="text-gray-400 text-sm mt-1">View the device location in real time</p>
                  </div>
                </div>

                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🔍</span>
                      <span className="text-white font-semibold text-sm">How it works</span>
                    </div>
                    <p className="text-gray-400 text-sm ml-7">
                      Our technology tracks the target&apos;s device and maps frequent locations, suspicious spots and movement patterns.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🔒</span>
                      <span className="text-white font-semibold text-sm">Confidential for you</span>
                    </div>
                    <p className="text-gray-400 text-sm ml-7">
                      No alert is sent to the monitored device. You receive the full report here, on the dashboard.
                    </p>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartTracking}
                  className="w-full mt-6 py-4 rounded-xl font-bold text-white text-base"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7, #7c3aed)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Start Tracking
                  </span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {stage === 'tracking' && (
          <motion.div
            key="tracking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-start p-4 pt-8"
          >
            <div className="w-full max-w-md space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-white font-bold">Active Tracking</h2>
                      <p className="text-gray-400 text-sm">Detecting location...</p>
                    </div>
                  </div>
                  <span className="text-green-400 font-bold text-sm">{Math.floor(progress)}%</span>
                </div>

                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500 rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>

              <div className="space-y-3">
                {trackingSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: index <= currentStepIndex ? 1 : 0.4, 
                      x: 0 
                    }}
                    transition={{ delay: index * 0.15 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      index < currentStepIndex
                        ? 'bg-[#1a1a2e] border border-red-500/30'
                        : index === currentStepIndex
                        ? 'bg-[#1a1a2e] border border-red-500/30'
                        : 'bg-transparent'
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : index === currentStepIndex ? (
                      <div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      index <= currentStepIndex ? 'text-white' : 'text-gray-500'
                    }`}>
                      {step}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#1a1a0a] border border-yellow-600/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-500">⚠️</span>
                  <span className="text-yellow-400 font-semibold text-sm">Analysis in progress</span>
                </div>
                <p className="text-gray-400 text-sm ml-7">
                  Progress: {Math.floor(progress)}% • Estimated time: 20 minutes
                </p>
              </motion.div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleDeleteInvestigation}
                className="w-full py-3 rounded-xl font-semibold text-red-400 bg-red-500/10 border border-red-500/30 text-sm"
              >
                <span className="flex items-center justify-center gap-2">
                  🗑️ Cancel Investigation
                </span>
              </motion.button>

              <div className="text-center">
                <p className="text-gray-500 text-sm mb-3">The analysis is taking too long...</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAccelerate}
                  className="w-full py-4 rounded-xl font-bold text-white text-base"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7, #7c3aed)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    ⚡ Accelerate for 30 credits
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-start p-4 pt-6 pb-20"
          >
            <div className="w-full max-w-md space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Last detected location:</p>
                    <p className="text-white font-bold">{locationDisplay}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1a0a0a] border border-red-500/30 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500">⚠️</span>
                  <span className="text-white font-semibold text-sm">1 Suspicious location found</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">See all locations on the map below:</p>

                {locationData?.lat && locationData?.lng ? (
                  <div className="rounded-xl overflow-hidden border border-gray-700">
                    <iframe
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${locationData.lng - 0.05},${locationData.lat - 0.03},${locationData.lng + 0.05},${locationData.lat + 0.03}&layer=mapnik&marker=${locationData.lat},${locationData.lng}`}
                    />
                  </div>
                ) : (
                  <div className="w-full h-[200px] bg-gray-800 rounded-xl flex items-center justify-center">
                    <p className="text-gray-500 text-sm">Loading map...</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-500/30 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👁️</span>
                  <div>
                    <h3 className="text-white font-bold text-sm">Real-Time Tracking</h3>
                    <p className="text-gray-400 text-xs">View the live location of the device</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleActivateRealTime}
                  className="w-full mt-2 py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-red-600 to-red-500"
                >
                  Activate Tracking for 40 credits
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-red-500">📍</span>
                  <h3 className="text-white font-bold">Locations Found</h3>
                </div>
                <p className="text-gray-400 text-sm mb-3">Suspicious places where the target may have been.</p>

                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">📍</span>
                    <div>
                      <h4 className="text-white font-semibold text-sm">{cityName}</h4>
                      <p className="text-gray-400 text-xs mt-1">
                        Address flagged as a point of attention due to detected frequency. Recent visit recorded a few weeks ago.
                      </p>
                      <button className="text-red-400 text-xs mt-2 hover:underline">
                        ✓ View location
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span>🏙️</span>
                  <h3 className="text-white font-bold">Data by cities</h3>
                </div>

                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">📍</span>
                    <div>
                      <h4 className="text-white font-semibold text-sm">{cityName}</h4>
                      <p className="text-gray-400 text-xs">1 suspicious location</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDeleteInvestigation}
                className="w-full py-3 rounded-xl font-semibold text-red-400 bg-red-500/10 border border-red-500/30 text-sm"
              >
                <span className="flex items-center justify-center gap-2">
                  🗑️ Delete Investigation
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNoCreditsPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNoCreditsPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c2e] border border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="text-4xl mb-3">💳</div>
              <h3 className="text-white font-bold text-lg mb-2">Insufficient Credits</h3>
              <p className="text-gray-400 text-sm mb-2">
                You don&apos;t have enough credits for this action.
              </p>
              <p className="text-yellow-400 text-sm mb-4">
                Your balance: {currentCredits} credits
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleBuyCredits}
                className="w-full py-3 rounded-xl font-bold text-white mb-2"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                }}
              >
                Buy Credits
              </motion.button>
              <button
                onClick={() => setShowNoCreditsPopup(false)}
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LocationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LocationContent />
    </Suspense>
  );
}
