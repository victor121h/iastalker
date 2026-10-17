'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { IconFlame } from '@/components/studio/icons';

// Fixed (not random) so server and client render the same markup.
const EMBERS = [
  { x: -54, size: 6, delay: 0, duration: 2.6 },
  { x: -30, size: 4, delay: 0.7, duration: 2.2 },
  { x: -8, size: 5, delay: 1.4, duration: 2.8 },
  { x: 14, size: 7, delay: 0.3, duration: 2.4 },
  { x: 36, size: 4, delay: 1.1, duration: 2.1 },
  { x: 58, size: 5, delay: 1.8, duration: 2.7 },
  { x: -42, size: 3, delay: 2.1, duration: 2.3 },
  { x: 46, size: 3, delay: 0.9, duration: 2.5 },
];

/** Celebratory glowing flame with rising embers (static when the user prefers reduced motion). */
export function FireBurst() {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-36 w-36" aria-hidden="true">
      <div className="absolute -inset-8 rounded-full bg-studio-fire opacity-50 blur-3xl animate-studio-pulse-glow" />
      {!reduce &&
        EMBERS.map((e, i) => (
          <motion.span
            key={i}
            className="absolute bottom-6 left-1/2 rounded-full bg-gradient-to-t from-studio-red to-studio-amber"
            style={{ width: e.size, height: e.size, marginLeft: e.x }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [-10, -150], opacity: [0, 1, 0] }}
            transition={{ duration: e.duration, delay: e.delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      <motion.div
        className="relative flex h-full w-full items-center justify-center rounded-full studio-gradient-bg studio-glow"
        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 16 }}
      >
        <div className="absolute inset-2 rounded-full border border-white/25" />
        <IconFlame size={64} strokeWidth={1.6} className="text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
      </motion.div>
    </div>
  );
}
