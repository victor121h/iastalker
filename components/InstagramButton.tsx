'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface InstagramButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'gradient' | 'outline';
  icon?: ReactNode;
  className?: string;
}

export default function InstagramButton({
  children,
  onClick,
  variant = 'gradient',
  icon,
  className = '',
}: InstagramButtonProps) {
  const baseStyles = 'h-[44px] px-6 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200';

  const variantStyles = {
    gradient: 'text-white hover:opacity-90 relative overflow-hidden',
    outline: 'border border-[#262626] text-white hover:bg-white/5',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={variant === 'gradient' ? {
        background: 'linear-gradient(135deg, #D62976 0%, #FA7E1E 50%, #FEDA75 100%)',
      } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <span className="relative z-10 flex items-center gap-2">
        {icon && icon}
        {children}
      </span>
    </motion.button>
  );
}
