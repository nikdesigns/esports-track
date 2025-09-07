'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Trophy, Bell } from 'lucide-react';
import FallbackImage from './FallbackImage';
import GameIcon from './GameIcon';

type Team = {
  id: number;
  name?: string | null;
  acronym?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
};

type OpponentEntry = {
  opponent?: Team | null;
  score?: number | null;
  result?: any;
};

type GameItem = {
  id?: number | null;
  rounds?: number[] | null;
  results?: any[] | null;
  winner?: { id?: number | null } | null;
  position?: number | null;
  status?: string | null;
};

export type Match = {
  id: number;
  name?: string | null;
  scheduled_at?: string | null;
  begin_at?: string | null;
  end_at?: string | null;
  status?: string;
  videogame?: { slug?: string | null; name?: string | null } | null;
  league?: { name?: string | null; image_url?: string | null } | null;
  tournament?: { name?: string | null } | null;
  serie?: { name?: string | null } | null;
  opponents?: OpponentEntry[]; // optional for defensive reads
  games?: GameItem[] | null;
  streams_list?: { raw_url?: string }[] | null;
  results?: { team_id?: number; score?: number }[] | null;
  winner?: { id?: number } | null;
  winner_id?: number | null;
  forfeit?: boolean;
  rescheduled?: boolean;
  detailed_stats?: any;
  [k: string]: any;
};

function safeText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (typeof value === 'object') {
    if ('name' in value && typeof value.name === 'string') return value.name;
    if ('full_name' in value && typeof value.full_name === 'string')
      return value.full_name;
  }
  return String(value);
}

function getOpponentImage(op?: Team | null): string | null {
  if (!op) return null;
  return (op as any).image_url ?? (op as any).logo_url ?? null;
}

const timeFormatter = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const formatMatchDate = (dateString?: string | null) => {
  if (!dateString) return 'TBD';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return `Today, ${timeFormatter.format(date)}`;
    if (diffInHours < 48) return `Tomorrow, ${timeFormatter.format(date)}`;
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'TBD';
  }
};

function mapResultsToOpponentOrder(match: Match): (number | null)[] | null {
  if (!Array.isArray(match.opponents) || match.opponents.length === 0)
    return null;
  const resultsMap = new Map<number, number>();
  if (Array.isArray(match.results)) {
    for (const r of match.results) {
      if (typeof r.team_id === 'number' && typeof r.score === 'number')
        resultsMap.set(r.team_id, r.score);
    }
  }
  const scores: (number | null)[] = match.opponents.map((op) => {
    const id = (op as any).opponent?.id ?? null;
    if (id && resultsMap.has(id)) return resultsMap.get(id) ?? null;
    if (typeof (op as any).score === 'number') return (op as any).score;
    if (typeof (op as any).result === 'number') return (op as any).result;
    return null;
  });
  if (scores.every((s) => s === null)) return null;
  return scores;
}

/**
 * extractGameChips: builds concise chips (like "16-12" or "not_started" -> filtered)
 * - filters out unhelpful statuses like "not_started"
 * - deduplicates identical chips
 */
function extractGameChips(match: Match): string[] {
  if (!Array.isArray(match.games)) return [];
  const raw: string[] = [];

  for (const g of match.games) {
    // prefer rounds
    if (Array.isArray(g.rounds) && g.rounds.length >= 2) {
      raw.push(`${g.rounds[0]}-${g.rounds[1]}`);
      continue;
    }

    // fallback to per-game results array if present
    if (Array.isArray(g.results) && g.results.length > 0) {
      const numericScores = g.results
        .map((r: any) =>
          typeof r.score === 'number'
            ? r.score
            : typeof r.value === 'number'
            ? r.value
            : null
        )
        .filter((v) => v !== null);
      if (numericScores.length >= 2) {
        raw.push(`${numericScores[0]}-${numericScores[1]}`);
        continue;
      }
    }

    // status - ignore generic "not_started" because it's noisy
    if (g.status && typeof g.status === 'string') {
      const s = g.status.toLowerCase();
      if (s !== 'not_started' && s !== 'notstarted' && s !== 'scheduled') {
        raw.push(s);
      }
    } else if (typeof g.position === 'number') {
      raw.push(`Game ${g.position}`);
    }
  }

  // dedupe while preserving order
  const deduped: string[] = [];
  for (const r of raw) {
    if (!deduped.includes(r)) deduped.push(r);
  }
  return deduped;
}

export default function MatchCard({ match }: { match: Match }) {
  // defensive reads
  const left = match.opponents?.[0]?.opponent ?? null;
  const right = match.opponents?.[1]?.opponent ?? null;

  const winner =
    (match.winner && (match.winner as any)) ??
    (typeof match.winner_id === 'number'
      ? match.opponents?.find((o) => o.opponent?.id === match.winner_id)
          ?.opponent ?? null
      : null);

  const scores = mapResultsToOpponentOrder(match);
  const leftScore = scores?.[0] ?? null;
  const rightScore = scores?.[1] ?? null;
  const leftWins =
    leftScore !== null && rightScore !== null && leftScore > rightScore;
  const rightWins =
    leftScore !== null && rightScore !== null && rightScore > leftScore;

  const gameChips = extractGameChips(match);
  const tournamentHeader =
    safeText(match.tournament) ||
    safeText(match.serie) ||
    safeText(match.league) ||
    'Unknown Tournament';
  const isScheduled = match.status === 'not_started';

  const headerTime =
    match.status === 'running'
      ? `Live • ${
          match.begin_at ? timeFormatter.format(new Date(match.begin_at)) : ''
        }`
      : match.status === 'finished'
      ? `Finished • ${
          match.end_at ? timeFormatter.format(new Date(match.end_at)) : ''
        }`
      : match.scheduled_at
      ? formatMatchDate(match.scheduled_at)
      : 'TBD';

  return (
    <div className="bg-[#121214] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2 bg-[#0f0f11] border-b border-gray-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-sm text-gray-300 font-semibold truncate">
            {tournamentHeader}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <GameIcon
            slug={match.videogame?.slug ?? match.videogame?.name ?? ''}
            size={14}
            showLabel={false}
          />
          {match.league?.image_url ? (
            <div className="relative w-5 h-5">
              <Image
                src={match.league.image_url}
                alt={safeText(match.league)}
                fill
                sizes="20px"
                className="object-contain rounded"
              />
            </div>
          ) : null}
          <div className="text-xs text-gray-400 whitespace-nowrap">
            {headerTime}
          </div>
        </div>
      </div>

      <div
        className={`px-4 py-3 flex items-center justify-between gap-4 ${
          isScheduled
            ? 'border-l-4 border-l-blue-500'
            : match.status === 'running'
            ? 'border-l-4 border-l-red-500'
            : match.status === 'finished'
            ? 'border-l-4 border-l-green-500'
            : 'border-l-4 border-l-gray-500'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 relative flex-shrink-0">
            {left && getOpponentImage(left) ? (
              <Image
                src={getOpponentImage(left) as string}
                alt={safeText(left)}
                fill
                sizes="40px"
                className="object-contain rounded-full"
              />
            ) : (
              <FallbackImage />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span
              className={`text-sm truncate ${
                winner?.id === left?.id
                  ? 'text-green-400 font-bold'
                  : 'text-gray-200'
              }`}
            >
              {safeText(left?.acronym ?? left?.name ?? 'TBD')}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center px-4">
          {isScheduled ? (
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-[#081126] border border-blue-700 text-blue-300 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4" />
                <div className="text-sm font-semibold">
                  {formatMatchDate(match.scheduled_at)}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">Scheduled</div>
            </div>
          ) : scores ? (
            <div className="flex items-center gap-3">
              <span
                className={`text-2xl font-bold ${
                  leftWins ? 'text-green-300' : 'text-gray-300'
                }`}
              >
                {leftScore ?? 0}
              </span>
              <span className="text-2xl font-extrabold text-white">—</span>
              <span
                className={`text-2xl font-bold ${
                  rightWins ? 'text-green-300' : 'text-gray-300'
                }`}
              >
                {rightScore ?? 0}
              </span>
            </div>
          ) : (
            <div className="text-gray-400 font-medium">vs</div>
          )}

          {gameChips.length > 0 && (
            <div className="flex gap-2 mt-2">
              {gameChips.map((c, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded bg-[#0e0f11] border border-gray-700 text-gray-300"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 min-w-0 justify-end">
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-2 justify-end">
              {winner?.id === right?.id && (
                <Trophy className="h-4 w-4 text-yellow-400" />
              )}
              <span
                className={`text-sm truncate ${
                  winner?.id === right?.id
                    ? 'text-green-400 font-bold'
                    : 'text-gray-200'
                }`}
              >
                {safeText(right?.acronym ?? right?.name ?? 'TBD')}
              </span>
            </div>
          </div>

          <div className="w-10 h-10 relative flex-shrink-0">
            {right && getOpponentImage(right) ? (
              <Image
                src={getOpponentImage(right) as string}
                alt={safeText(right)}
                fill
                sizes="40px"
                className="object-contain rounded-full"
              />
            ) : (
              <FallbackImage />
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 bg-[#0f0f10] border-t border-gray-800 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {match.videogame?.name ?? match.videogame?.slug ?? ''}
        </div>
        <div className="flex items-center gap-2">
          {isScheduled ? (
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded inline-flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Remind
            </button>
          ) : match.status === 'running' &&
            match.streams_list &&
            match.streams_list.length > 0 ? (
            <a
              href={match.streams_list[0].raw_url}
              target="_blank"
              rel="noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
            >
              Watch
            </a>
          ) : (
            <Link
              href={`/matches/${match.id}`}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded"
            >
              Details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
