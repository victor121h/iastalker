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
    gradient: 'bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:opacity-90 relative overflow-hidden',
    outline: 'border border-sky-300 text-slate-700 hover:bg-sky-50',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {variant === 'gradient' && (
        <div className="absolute inset-0 bg-black opacity-0 hover:opacity-25 transition-opacity duration-200" />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon && icon}
        {children}
      </span>
    </motion.button>
  );
}
