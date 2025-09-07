// components/ImageWithFallback.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';

type Props = {
  src?: string | null;
  alt?: string;
  width: number;
  height: number;
  className?: string;
  fallback?: string;
  unoptimized?: boolean;
};

export default function ImageWithFallback({
  src,
  alt,
  width,
  height,
  className = '',
  fallback = '/images/fallback.png',
  unoptimized = true, // keep true for dev; set to false after whitelisting domains
}: Props) {
  const [errored, setErrored] = useState(false);

  const sanitizedSrc = useMemo(() => {
    if (!src) return null;
    if (typeof src !== 'string') return null;
    let s = src.trim();
    while (s.endsWith('?') || s.endsWith('&')) s = s.slice(0, -1);
    if (s.startsWith('http://')) s = 'https://' + s.slice(7);
    return s || null;
  }, [src]);

  // Browser console debug: when image fails to load
  const onError = (ev?: any) => {
    setErrored(true);
    try {
      // give dev info in client console
      /* eslint-disable no-console */
      console.warn(
        '[ImageWithFallback] failed to load image:',
        sanitizedSrc,
        ev?.nativeEvent ?? ev
      );
      /* eslint-enable no-console */
    } catch {}
  };

  if (!sanitizedSrc || errored) {
    return (
      <div
        style={{ width, height }}
        className={`bg-gray-700 rounded-md overflow-hidden flex items-center justify-center ${className}`}
      >
        <img
          src={fallback}
          alt={alt ?? 'fallback'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <Image
      src={sanitizedSrc}
      alt={alt ?? ''}
      width={width}
      height={height}
      className={className}
      onError={onError}
      unoptimized={unoptimized}
    />
  );
}
