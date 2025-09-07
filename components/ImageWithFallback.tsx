// components/ImageWithFallback.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';

type Props = {
  src?: string | null;
  alt?: string;
  width: number;
  height: number;
  className?: string;
  fallback?: string; // optional path to fallback raster image (public/)
  unoptimized?: boolean; // defaults to true for dev convenience
  quality?: number;
  priority?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
};

function defaultSanitize(raw?: string | null) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  while (s.endsWith('?') || s.endsWith('&')) s = s.slice(0, -1);
  // if OpenDota returns a path like "/apps/..." convert to absolute
  if (s.startsWith('/')) s = `https://api.opendota.com${s}`;
  if (s.startsWith('http://')) s = 'https://' + s.slice(7);
  return s || null;
}

function NiceFallback({ width, height }: { width: number; height: number }) {
  // simple inline SVG + subtle background — looks better than "No Image" text
  const size = Math.min(width, height);
  return (
    <div
      style={{ width, height }}
      className="bg-gray-800/80 rounded-md flex items-center justify-center overflow-hidden"
    >
      <svg
        width={Math.max(24, Math.floor(size * 0.5))}
        height={Math.max(24, Math.floor(size * 0.5))}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <rect width="24" height="24" rx="4" fill="#1f2937" />
        <path
          d="M7 12c1.333-2 4-2 6 0 2-2 4.667-2 6 0v4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-4z"
          fill="#374151"
        />
        <circle cx="12" cy="9" r="2.2" fill="#9CA3AF" />
      </svg>
    </div>
  );
}

export default function ImageWithFallback({
  src,
  alt,
  width,
  height,
  className = '',
  fallback = '/images/fallback.png',
  unoptimized = true,
  quality,
  priority = false,
  objectFit = 'contain',
}: Props) {
  const [errored, setErrored] = useState(false);

  const sanitized = useMemo(() => defaultSanitize(src ?? null), [src]);

  const handleError = (ev?: any) => {
    setErrored(true);
    try {
      // Browser console logging for debugging — copy URL and open directly
      // eslint-disable-next-line no-console
      console.warn(
        '[ImageWithFallback] image load failed:',
        sanitized,
        ev?.nativeEvent ?? ev
      );
    } catch {}
  };

  // If no URL or image errored, show fallback (raster if provided, else SVG)
  if (!sanitized || errored) {
    if (fallback) {
      // show raster fallback from /public
      return (
        <div
          style={{ width, height }}
          className={`rounded-md overflow-hidden ${className}`}
        >
          {/* using native <img> for the fallback keeps this component small/simple */}
          <img
            src={fallback}
            alt={alt ?? 'fallback'}
            width={width}
            height={height}
            style={{ width: '100%', height: '100%', objectFit }}
          />
        </div>
      );
    }
    return <NiceFallback width={width} height={height} />;
  }

  return (
    <Image
      src={sanitized}
      alt={alt ?? ''}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      unoptimized={unoptimized}
      quality={quality}
      priority={priority}
      style={{ objectFit }}
    />
  );
}
