// components/GameIcon.tsx
import React from 'react';

type Props = {
  slug?: string | null;
  size?: number;
  showLabel?: boolean;
  className?: string;
  title?: string | null;
};

function SvgWrapper({
  children,
  size = 18,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  const s = size ?? 18;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      {children}
    </svg>
  );
}

/* Minimal inline icons (stylised) */
function Dota2({ size = 18 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <rect width="24" height="24" rx="4" fill="#E63946" />
      <path
        d="M6 18c4-3 12-10 12-10"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="9.5" r="1.2" fill="#fff" />
    </SvgWrapper>
  );
}

function Csgo({ size = 18 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <rect width="24" height="24" rx="4" fill="#0F1724" />
      <path
        d="M5 17c3-3 10-10 14-11"
        stroke="#F59E0B"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7l3 1"
        stroke="#F59E0B"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </SvgWrapper>
  );
}

function Valorant({ size = 18 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <rect width="24" height="24" rx="4" fill="#FF4D4D" />
      <path
        d="M6 18L12 6l6 12"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgWrapper>
  );
}

function Lol({ size = 18 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <rect width="24" height="24" rx="4" fill="#4F46E5" />
      <path
        d="M7 17s1-6 5-8c4-2 4 2 4 2"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 7c1-1 3-1 4 0"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </SvgWrapper>
  );
}

function BadgeFallback({
  slug,
  size = 18,
}: {
  slug?: string | null;
  size?: number;
}) {
  const initials =
    (slug || '')
      .split(/[-_ ]+/)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || '?';
  const fontSize = Math.max(9, Math.floor((size ?? 18) / 2));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: '#0f1724',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden
    >
      <span style={{ color: '#E6EEF8', fontSize, fontWeight: 600 }}>
        {initials}
      </span>
    </div>
  );
}

/* map slug -> readable label */
const LABEL_MAP: Record<string, string> = {
  dota2: 'Dota 2',
  csgo: 'CS:GO',
  valorant: 'Valorant',
  lol: 'LoL',
  leagueoflegends: 'LoL',
  'league-of-legends': 'LoL',
};

/* main component */
export default function GameIcon({
  slug,
  size = 18,
  showLabel = true,
  className = '',
  title,
}: Props) {
  const normalized = (slug ?? '').toLowerCase().trim();
  const key = normalized.replace(/[^a-z0-9]/g, '');

  const resolved =
    key === 'dota2' || key === 'dota-2' || key === 'dota'
      ? 'dota2'
      : key === 'csgo' || key === 'counterstrike'
      ? 'csgo'
      : key === 'valorant'
      ? 'valorant'
      : key === 'lol' ||
        key === 'leagueoflegends' ||
        key === 'league-of-legends'
      ? 'lol'
      : key;

  const label = title ?? LABEL_MAP[resolved] ?? (slug ? slug : '');

  const innerIcon = (() => {
    switch (resolved) {
      case 'dota2':
        return <Dota2 size={size} />;
      case 'csgo':
        return <Csgo size={size} />;
      case 'valorant':
        return <Valorant size={size} />;
      case 'lol':
        return <Lol size={size} />;
      default:
        return <BadgeFallback slug={slug ?? ''} size={size} />;
    }
  })();

  // badge style
  const badgeStyle =
    'inline-flex items-center gap-2 px-2 py-0.5 rounded-md shadow-sm border border-gray-800 bg-[#0f1114]';

  return (
    <div className={`inline-flex items-center ${className}`} title={label}>
      <div className={badgeStyle} aria-hidden>
        <div style={{ width: size, height: size, display: 'inline-flex' }}>
          {innerIcon}
        </div>
        {showLabel && (
          <span
            className="text-xs font-medium text-gray-300 select-none"
            style={{ lineHeight: 1 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
