// components/LiveMiniCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import ImageWithFallback from './ImageWithFallback';
import GameIcon from './GameIcon'; // your SVG-based component or fallback
import { Trophy } from 'lucide-react';

type MatchShape = any;

function shortTime(dateStr?: string | null) {
  if (!dateStr) return 'TBD';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'TBD';
  }
}

/** Try to return ISO2 country or null from opponent object */
function getCountryCodeFrom(opponent: any): string | null {
  if (!opponent) return null;
  const loc = opponent.location ?? opponent.country ?? opponent.region ?? null;
  if (!loc) return null;
  // sometimes API uses full name (e.g. "United States") — ideally you'd map this, but try 2-letter
  if (typeof loc === 'string' && loc.length === 2) return loc.toLowerCase();
  if (typeof loc === 'string' && loc.length > 2) {
    // attempt: if it's already uppercase ISO2, lower it; else null
    return loc.slice(0, 2).toLowerCase();
  }
  return null;
}

export default function LiveMiniCard({
  match,
  compact = false,
}: {
  match: MatchShape;
  compact?: boolean;
}) {
  const opps = match.opponents ?? [];
  const a = opps[0]?.opponent ?? null;
  const b = opps[1]?.opponent ?? null;
  const scoreA = match.score?.[0] ?? match.radiant_score ?? null;
  const scoreB = match.score?.[1] ?? match.dire_score ?? null;
  const isLive = match.status === 'running' || match.status === 'live';
  const winnerId = match.winner_id ?? match.winner?.id ?? null;
  const gameSlug =
    match.videogame?.slug ??
    match.videogame_title?.slug ??
    match.videogame?.name ??
    null;

  const logoA = a?.image_url ?? a?.logo_url ?? null;
  const logoB = b?.image_url ?? b?.logo_url ?? null;

  const cA = getCountryCodeFrom(a);
  const cB = getCountryCodeFrom(b);

  return (
    <Link href={`/matches/${match.id}`}>
      <a
        className={`block bg-[#121212] border border-gray-800 rounded-xl p-3 hover:border-blue-600 transition ${
          compact ? 'h-16' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
              {logoA ? (
                <ImageWithFallback
                  src={logoA}
                  alt={a?.name}
                  width={40}
                  height={40}
                />
              ) : (
                <div className="w-10 h-10 bg-gray-700 flex items-center justify-center text-xs text-white">
                  T
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-100 truncate">
                  {a?.acronym ?? a?.name ?? 'Team A'}
                </div>
                {cA && (
                  <img
                    src={`https://flagcdn.com/16x12/${cA}.png`}
                    alt={cA}
                    width={16}
                    height={12}
                    className="inline-block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                {winnerId && a?.id === winnerId && (
                  <Trophy className="h-4 w-4 text-yellow-400 ml-1" />
                )}
              </div>
              {!compact && (
                <div className="text-xs text-gray-400 truncate mt-1">
                  {b?.acronym ?? b?.name ?? ''}
                </div>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div
              className={`text-sm font-bold text-white ${
                isLive ? 'text-red-400' : ''
              }`}
            >
              {isLive ? `${scoreA ?? 0} - ${scoreB ?? 0}` : '--'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {isLive
                ? 'Live'
                : shortTime(match.scheduled_at ?? match.begin_at)}
            </div>
          </div>
        </div>

        {/* bottom row: opponent B + game icon (compact hides extra info) */}
        {!compact && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                {logoB ? (
                  <ImageWithFallback
                    src={logoB}
                    alt={b?.name}
                    width={32}
                    height={32}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 flex items-center justify-center text-xs text-white">
                    T
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-200 truncate">
                {b?.acronym ?? b?.name ?? 'Team B'}
              </div>
              {getCountryCodeFrom(b) && (
                <img
                  src={`https://flagcdn.com/16x12/${getCountryCodeFrom(b)}.png`}
                  alt={getCountryCodeFrom(b) ?? ''}
                  width={16}
                  height={12}
                  className="inline-block"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              {/** GameIcon: try to render, fallback to small text badge */}
              {typeof GameIcon === 'function' ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6">
                    <GameIcon slug={gameSlug} size={18} />
                  </div>
                  <div className="text-xs text-gray-400 capitalize">
                    {gameSlug ?? ''}
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-[#111111] text-gray-300 px-2 py-0.5 rounded">
                  {gameSlug ?? 'Game'}
                </div>
              )}
            </div>
          </div>
        )}
      </a>
    </Link>
  );
}
