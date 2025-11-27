'use client';

import { useState, memo } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

function OptimizedImageComponent({ src, alt, className = '', fallbackClassName = '' }: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return <div className={fallbackClassName || className} style={{ backgroundColor: '#262626' }} />;
  }

  return (
    <>
      {!isLoaded && (
        <div className={`${fallbackClassName || className} animate-pulse`} style={{ backgroundColor: '#262626' }} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? '' : 'hidden'}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </>
  );
}

export const OptimizedImage = memo(OptimizedImageComponent);
