// app/matches/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Share2, Bookmark, BookmarkMinus, X } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';

type Team = {
  id: number;
  name?: string | null;
  acronym?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  location?: string | null;
};

type OpponentEntry = {
  type?: string;
  opponent?: Team | null;
  score?: number | null;
  result?: any;
};

type GameItem = {
  id?: number;
  position?: number;
  status?: string | null;
  winner?: { id?: number | null } | null;
  rounds?: number[] | null;
  results?: any[] | null;
  [k: string]: any;
};

type MatchPayload = {
  id: number;
  name?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  begin_at?: string | null;
  end_at?: string | null;
  videogame?: { slug?: string; name?: string } | null;
  videogame_title?: any;
  league?: { name?: string | null; image_url?: string | null } | null;
  tournament?: { name?: string | null } | null;
  serie?: { name?: string | null; full_name?: string | null } | null;
  opponents?: OpponentEntry[] | null;
  games?: GameItem[] | null;
  streams_list?: { raw_url?: string }[] | null;
  results?: { team_id?: number; score?: number }[] | null;
  winner?: Team | null;
  winner_id?: number | null;
  forfeit?: boolean;
  rescheduled?: boolean;
  detailed_stats?: any;
  [k: string]: any;
};

const timeFormatter = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const formatTime = (s?: string | null) => {
  if (!s) return 'TBD';
  try {
    return timeFormatter.format(new Date(s));
  } catch {
    return 'TBD';
  }
};

function safeText(v: any) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    if ('name' in v) return String((v as any).name);
    if ('full_name' in v) return String((v as any).full_name);
  }
  return String(v);
}

function getOpponentImage(t?: Team | null) {
  if (!t) return null;
  return (t as any).image_url ?? (t as any).logo_url ?? null;
}

/**
 * Map results[] (team_id -> score) into a pair aligned with opponents array order.
 */
function mapResultsToOpponentOrder(
  match: MatchPayload
): (number | null)[] | null {
  if (!Array.isArray(match.opponents) || match.opponents.length === 0)
    return null;

  const resultsMap = new Map<number, number>();
  if (Array.isArray(match.results)) {
    for (const r of match.results) {
      if (typeof r.team_id === 'number' && typeof r.score === 'number') {
        resultsMap.set(r.team_id, r.score);
      }
    }
  }

  const scores: (number | null)[] = match.opponents.map((op) => {
    const id = op?.opponent?.id ?? null;
    if (id && resultsMap.has(id)) return resultsMap.get(id) ?? null;
    if (typeof (op as any).score === 'number') return (op as any).score;
    if (typeof (op as any).result === 'number') return (op as any).result;
    return null;
  });

  if (scores.every((s) => s === null)) return null;
  return scores;
}

function extractGameChips(match: MatchPayload): string[] {
  const chips: string[] = [];
  if (!Array.isArray(match.games)) return chips;

  for (const g of match.games) {
    if (Array.isArray(g.rounds) && g.rounds.length >= 2) {
      chips.push(`${g.rounds[0]}-${g.rounds[1]}`);
      continue;
    }
    if (Array.isArray(g.results) && g.results.length >= 2) {
      const nums = g.results
        .map((r: any) =>
          typeof r.score === 'number'
            ? r.score
            : typeof r.value === 'number'
            ? r.value
            : null
        )
        .filter((n: any) => n != null);
      if (nums.length >= 2) chips.push(`${nums[0]}-${nums[1]}`);
      continue;
    }
    if (g.status) chips.push(String(g.status));
    else if (typeof g.position === 'number') chips.push(`Game ${g.position}`);
    else chips.push('—');
  }

  return chips;
}

/* ---------- New UI helpers: chips for badges ---------- */

function StatusChip({
  children,
  colorClass = 'bg-yellow-700 text-yellow-100',
}: {
  children: React.ReactNode;
  colorClass?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded ${colorClass}`}
    >
      {children}
    </span>
  );
}

/* ---------- Main component ---------- */

export default function MatchDetailPage() {
  const [match, setMatch] = useState<MatchPayload | null>(null);
  const [rawPayload, setRawPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookmarked, setBookmarked] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);

  // derive id from URL client-side
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  const id = pathname.split('/').pop();

  useEffect(() => {
    // load bookmarks from localStorage
    try {
      const raw = localStorage.getItem('bookmarkedMatches');
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        setBookmarked(arr.includes(Number(id)));
      }
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setError('No match id found in URL');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const include = [
      'opponents',
      'games',
      'streams_list',
      'league',
      'tournament',
      'serie',
      'extra',
      'detailed_stats',
    ].join(',');

    fetch(
      `/api/matches/${encodeURIComponent(id)}?include=${encodeURIComponent(
        include
      )}`
    )
      .then(async (res) => {
        const text = await res.text();
        let json: any;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = text;
        }
        if (!res.ok) {
          const msg =
            (json && (json.error || json.message)) ||
            `Failed to fetch match: ${res.status}`;
          throw new Error(msg);
        }
        return json;
      })
      .then((payload) => {
        setRawPayload(payload);
        // Usually payload is object for match/:id
        let obj: any = payload;
        if (payload && typeof payload === 'object') {
          if (payload.data) obj = payload.data;
          else if (payload.result) obj = payload.result;
        }
        if (Array.isArray(obj)) obj = obj[0] ?? null;

        if (obj && obj.opponents && !Array.isArray(obj.opponents)) {
          try {
            obj.opponents = Object.keys(obj.opponents).map(
              (k) => obj.opponents[k]
            );
          } catch {
            // ignore
          }
        }

        setMatch(obj);
      })
      .catch((err: any) => {
        console.error('Failed to fetch match:', err);
        setError(err?.message ?? 'Failed to load match');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (rawPayload) {
      // eslint-disable-next-line no-console
      console.log('Raw match payload:', rawPayload);
    }
  }, [rawPayload]);

  const toggleBookmark = () => {
    const mid = Number(id);
    try {
      const raw = localStorage.getItem('bookmarkedMatches');
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      if (bookmarked) {
        const newArr = arr.filter((x) => x !== mid);
        localStorage.setItem('bookmarkedMatches', JSON.stringify(newArr));
        setBookmarked(false);
      } else {
        arr.push(mid);
        localStorage.setItem('bookmarkedMatches', JSON.stringify(arr));
        setBookmarked(true);
      }
    } catch (e) {
      console.error('Bookmark storage failed', e);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: match?.name ?? 'Match',
          text: match ? `Watch ${match.name}` : 'Check this match',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // small user feedback — toast would be nicer, but simple alert works
        alert('Match link copied to clipboard');
      }
    } catch (e) {
      console.error('Share failed', e);
      alert('Share failed — link copied to clipboard instead');
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-200 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
          <p className="font-semibold">Error</p>
          <p className="mt-2">{error}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/" className="text-sm text-blue-400 hover:underline">
              Back to matches
            </Link>
          </div>
          <details className="mt-3 text-xs text-gray-400">
            <summary>Show raw payload</summary>
            <pre className="max-h-64 overflow-auto mt-2 text-xs text-gray-300 bg-[#0b0b0b] p-2 rounded">
              {JSON.stringify(rawPayload, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-6 text-gray-200">
        <p>Match not found.</p>
        <Link href="/" className="text-blue-400 hover:underline">
          Back
        </Link>
        <details className="mt-3 text-xs text-gray-400">
          <summary>Show raw payload</summary>
          <pre className="max-h-64 overflow-auto mt-2 text-xs text-gray-300 bg-[#0b0b0b] p-2 rounded">
            {JSON.stringify(rawPayload, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  // computed values
  const scores = mapResultsToOpponentOrder(match);
  const leftScore = scores?.[0] ?? null;
  const rightScore = scores?.[1] ?? null;

  const teamA = match.opponents?.[0]?.opponent ?? match.opponents?.[0] ?? null;
  const teamB = match.opponents?.[1]?.opponent ?? match.opponents?.[1] ?? null;

  const gameChips = extractGameChips(match);

  const winner =
    match.winner ??
    (typeof match.winner_id === 'number'
      ? match.opponents?.find((o) => o.opponent?.id === match.winner_id)
          ?.opponent ?? null
      : null);

  const tournamentHeader =
    safeText(match.tournament) ||
    safeText(match.serie) ||
    safeText(match.league) ||
    'Unknown tournament';

  /* ------------ Per-team stats rendering ------------
     We try several shapes:
     - detailed_stats.team[<team_id>] or detailed_stats[team_id]
     - detailed_stats.players (array) filtered by team
     - fallback: show raw detailed_stats object
  */
  const renderPerTeamStats = () => {
    if (!match.detailed_stats) return null;

    // Case A: detailed_stats keyed by team id
    const byTeamEntries: [string, any][] = [];
    if (typeof match.detailed_stats === 'object') {
      for (const k of Object.keys(match.detailed_stats)) {
        const val = match.detailed_stats[k];
        // if key looks like numeric id
        if (
          /^\d+$/.test(k) ||
          (match.opponents &&
            match.opponents.some((o) => String(o.opponent?.id) === k))
        ) {
          byTeamEntries.push([k, val]);
        }
      }
    }

    // If we found team-keyed entries, render them mapping id -> team name if possible
    if (byTeamEntries.length > 0) {
      return (
        <section className="bg-[#111213] border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Team stats
          </h3>
          <div className="grid gap-2">
            {byTeamEntries.map(([key, val]) => {
              const tid = Number(key);
              const teamObj = match.opponents?.find(
                (o) => o.opponent?.id === tid
              )?.opponent;
              return (
                <div
                  key={key}
                  className="bg-[#0f0f10] p-2 rounded flex items-start justify-between"
                >
                  <div>
                    <div className="text-xs text-gray-400">
                      {teamObj
                        ? `${teamObj.acronym ?? teamObj.name}`
                        : `Team ${key}`}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    // Case B: detailed_stats.players — display per-player rows grouped by team if possible
    if (Array.isArray(match.detailed_stats?.players)) {
      const players = match.detailed_stats.players as any[];
      // group players by team id or team name
      const groups: Record<string, any[]> = {};
      for (const p of players) {
        const teamId = p.team_id ?? p.team?.id ?? 'unknown';
        if (!groups[teamId]) groups[teamId] = [];
        groups[teamId].push(p);
      }

      return (
        <section className="bg-[#111213] border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Player stats
          </h3>
          <div className="grid gap-3">
            {Object.entries(groups).map(([teamId, list]) => {
              const teamObj = match.opponents?.find(
                (o) => String(o.opponent?.id) === teamId
              )?.opponent;
              return (
                <div key={teamId} className="bg-[#0f0f10] p-2 rounded">
                  <div className="text-xs text-gray-400 mb-2">
                    {teamObj
                      ? `${teamObj.acronym ?? teamObj.name}`
                      : `Team ${teamId}`}
                  </div>
                  <div className="grid gap-1">
                    {list.map((p: any, i: number) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm text-gray-300"
                      >
                        <div className="truncate">
                          {p.name ?? p.nickname ?? p.player?.name ?? 'Player'}
                        </div>
                        <div className="ml-4 text-xs text-gray-400">
                          {JSON.stringify(p.stats ?? p)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    // Fallback: pretty-print detailed_stats
    return (
      <section className="bg-[#111213] border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          Detailed stats (raw)
        </h3>
        <pre className="max-h-64 overflow-auto text-xs text-gray-300 bg-[#0b0b0b] p-2 rounded">
          {JSON.stringify(match.detailed_stats, null, 2)}
        </pre>
      </section>
    );
  };

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto text-gray-200 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {match.name ?? `Match #${match.id}`}
            </h1>

            <div className="mt-1 flex items-center gap-2">
              <div className="text-sm text-gray-400">{tournamentHeader}</div>

              {/* status chips */}
              <div className="flex items-center gap-2">
                {match.forfeit && (
                  <StatusChip colorClass="bg-red-800 text-red-100">
                    <span>⚠️ Forfeit</span>
                  </StatusChip>
                )}
                {match.rescheduled && (
                  <StatusChip colorClass="bg-yellow-800 text-yellow-100">
                    <span>🔁 Rescheduled</span>
                  </StatusChip>
                )}
                {match.status === 'canceled' && (
                  <StatusChip colorClass="bg-gray-700 text-gray-100">
                    <span>🚫 Canceled</span>
                  </StatusChip>
                )}
                {match.status === 'running' && (
                  <StatusChip colorClass="bg-red-700 text-white">
                    ● Live
                  </StatusChip>
                )}
                {match.status === 'finished' && (
                  <StatusChip colorClass="bg-green-700 text-white">
                    ✓ Finished
                  </StatusChip>
                )}
              </div>
            </div>

            <div className="mt-1 text-xs text-gray-400">
              {match.status === 'running'
                ? `Live • ${formatTime(match.begin_at)}`
                : match.status === 'finished'
                ? `Finished • ${formatTime(match.end_at ?? match.begin_at)}`
                : match.scheduled_at
                ? formatTime(match.scheduled_at)
                : 'TBD'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* league image */}
            {match.league?.image_url ? (
              <div className="relative w-10 h-10">
                <Image
                  src={match.league.image_url}
                  alt={safeText(match.league)}
                  fill
                  sizes="40px"
                  className="object-contain rounded"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                <span className="text-white">L</span>
              </div>
            )}

            {/* Bookmark */}
            <button
              onClick={toggleBookmark}
              className="inline-flex items-center gap-2 bg-[#0f1112] px-3 py-2 rounded-md border border-gray-800 hover:bg-[#131316]"
              title={bookmarked ? 'Remove bookmark' : 'Bookmark match'}
            >
              {bookmarked ? (
                <BookmarkMinus className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              <span className="text-xs text-gray-200">
                {bookmarked ? 'Bookmarked' : 'Bookmark'}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 bg-[#0f1112] px-3 py-2 rounded-md border border-gray-800 hover:bg-[#131316]"
              title="Share match"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-xs text-gray-200">Share</span>
            </button>
          </div>
        </div>

        {/* Scorecard */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Team A */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 relative">
                {getOpponentImage(teamA as Team) ? (
                  <Image
                    src={getOpponentImage(teamA as Team) as string}
                    alt={safeText(teamA)}
                    fill
                    sizes="48px"
                    className="object-contain rounded-full"
                  />
                ) : (
                  <FallbackImage />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm truncate">
                  {teamA?.acronym ?? teamA?.name}
                  {winner?.id === teamA?.id && (
                    <Trophy className="inline-block ml-2 h-4 w-4 text-yellow-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Score center */}
            <div className="text-center">
              <div className="text-3xl font-bold">
                {leftScore != null && rightScore != null
                  ? `${leftScore} - ${rightScore}`
                  : 'vs'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {match.status ?? ''}
              </div>

              {gameChips.length > 0 && (
                <div className="flex gap-2 mt-3 justify-center flex-wrap">
                  {gameChips.map((c, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-[#0f0f10] border border-gray-700 text-gray-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Team B */}
            <div className="flex items-center gap-3 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div className="text-sm truncate">
                  {teamB?.acronym ?? teamB?.name}
                  {winner?.id === teamB?.id && (
                    <Trophy className="inline-block ml-2 h-4 w-4 text-yellow-400" />
                  )}
                </div>
              </div>
              <div className="w-12 h-12 relative">
                {getOpponentImage(teamB as Team) ? (
                  <Image
                    src={getOpponentImage(teamB as Team) as string}
                    alt={safeText(teamB)}
                    fill
                    sizes="48px"
                    className="object-contain rounded-full"
                  />
                ) : (
                  <FallbackImage />
                )}
              </div>
            </div>
          </div>

          {/* Streams / actions */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              {Array.isArray(match.streams_list) &&
              match.streams_list.length > 0 ? (
                <a
                  href={match.streams_list[0].raw_url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  Watch stream
                </a>
              ) : (
                <span className="text-xs text-gray-400">
                  No official stream
                </span>
              )}
            </div>

            <div>
              <Link href="/" className="text-sm text-gray-400 hover:text-white">
                Back
              </Link>
            </div>
          </div>
        </div>

        {/* Expanded breakdown */}
        <div className="space-y-4">
          {/* Games / map breakdown */}
          <section className="bg-[#111213] border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Game / Map breakdown
            </h3>

            {Array.isArray(match.games) && match.games.length > 0 ? (
              <div className="grid gap-2">
                {match.games.map((g, idx) => {
                  let scoreText = '—';
                  if (Array.isArray(g.rounds) && g.rounds.length >= 2)
                    scoreText = `${g.rounds[0]} - ${g.rounds[1]}`;
                  else if (Array.isArray(g.results) && g.results.length >= 2) {
                    const nums = g.results
                      .map((r: any) =>
                        typeof r.score === 'number'
                          ? r.score
                          : typeof r.value === 'number'
                          ? r.value
                          : null
                      )
                      .filter((n: any) => n != null);
                    if (nums.length >= 2) scoreText = `${nums[0]} - ${nums[1]}`;
                  } else if (g.status) scoreText = g.status;
                  return (
                    <div
                      key={g.id ?? idx}
                      className="flex items-center justify-between text-sm text-gray-300 bg-[#0f0f10] p-2 rounded"
                    >
                      <div>Game {g.position ?? idx + 1}</div>
                      <div className="font-medium">{scoreText}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                No per-game data available.
              </div>
            )}
          </section>

          {/* Forfeit / rescheduled / canceled notice */}
          {(match.forfeit ||
            match.rescheduled ||
            match.status === 'canceled') && (
            <section className="bg-[#161616] border border-yellow-900/30 rounded-xl p-4">
              <div className="text-sm text-yellow-300">
                {match.forfeit && (
                  <div>⚠️ This match has a forfeit recorded.</div>
                )}
                {match.rescheduled && <div>🔁 This match was rescheduled.</div>}
                {match.status === 'canceled' && (
                  <div>🚫 This match is canceled.</div>
                )}
              </div>
            </section>
          )}

          {/* Per-team / player stats */}
          {renderPerTeamStats()}

          {/* detailed_stats fallback */}
          {match.detailed_stats &&
            !Array.isArray(match.detailed_stats?.players) &&
            Object.keys(match.detailed_stats || {}).length > 0 && (
              <section className="bg-[#111213] border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  Detailed stats (raw)
                </h3>
                <pre className="max-h-64 overflow-auto text-xs text-gray-300 bg-[#0b0b0b] p-2 rounded">
                  {JSON.stringify(match.detailed_stats, null, 2)}
                </pre>
              </section>
            )}
        </div>
      </div>

      {/* Floating compact overlay toggle */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <button
          onClick={() => setCompactOpen((s) => !s)}
          className="flex items-center gap-2 bg-[#0f1112] px-3 py-2 rounded-full border border-gray-800 shadow-md hover:bg-[#131316]"
          title="Toggle compact scoreboard"
        >
          {compactOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Trophy className="h-4 w-4" />
          )}
          <span className="text-xs text-gray-200">
            {compactOpen ? 'Close' : 'Compact'}
          </span>
        </button>

        {/* Compact card */}
        {compactOpen && (
          <div className="w-64 bg-[#0f1112] border border-gray-800 rounded-xl p-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">{tournamentHeader}</div>
              <div className="text-xs text-gray-300">
                {match.videogame?.name ?? match.videogame?.slug ?? ''}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 relative">
                  {getOpponentImage(teamA as Team) ? (
                    <Image
                      src={getOpponentImage(teamA as Team) as string}
                      alt={safeText(teamA)}
                      fill
                      sizes="32px"
                      className="object-contain rounded-full"
                    />
                  ) : (
                    <FallbackImage />
                  )}
                </div>
                <div className="text-sm truncate text-gray-200">
                  {teamA?.acronym ?? teamA?.name}
                </div>
              </div>

              <div className="text-lg font-bold text-white">
                {leftScore != null && rightScore != null
                  ? `${leftScore} - ${rightScore}`
                  : 'vs'}
              </div>

              <div className="flex items-center gap-2 min-w-0 justify-end">
                <div className="text-sm truncate text-gray-200 text-right">
                  {teamB?.acronym ?? teamB?.name}
                </div>
                <div className="w-8 h-8 relative">
                  {getOpponentImage(teamB as Team) ? (
                    <Image
                      src={getOpponentImage(teamB as Team) as string}
                      alt={safeText(teamB)}
                      fill
                      sizes="32px"
                      className="object-contain rounded-full"
                    />
                  ) : (
                    <FallbackImage />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-400">{match.status}</div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="text-xs text-gray-300 px-2 py-1 rounded bg-[#0d0d0f]"
                >
                  Share
                </button>
                <button
                  onClick={toggleBookmark}
                  className="text-xs text-gray-300 px-2 py-1 rounded bg-[#0d0d0f]"
                >
                  {bookmarked ? 'Unbookmark' : 'Bookmark'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
