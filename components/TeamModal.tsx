// components/TeamModal.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

type TeamDetail = {
  id: number | null;
  name: string | null;
  tag?: string | null;
  logo_url?: string | null;
  rating?: number | null;
  wins?: number | null;
  losses?: number | null;
};

type RecentMatch = {
  match_id?: number | string | null;
  start_time?: number | string | null;
  radiant_win?: boolean | null;
  radiant?: boolean | null;
  opposing_team_name?: string | null;
  opposing_team_id?: number | null;
  score?: string | number | null;
  raw?: any;
};

const DEFAULT_RECENT = 5;

function format12Hour(dateLike: string | number | null | undefined) {
  if (!dateLike) return 'TBD';
  try {
    // OpenDota sometimes returns unix seconds, sometimes ms, handle both
    const asNum = Number(dateLike);
    const maybeMs = String(dateLike).length <= 10 ? asNum * 1000 : asNum;
    const d = new Date(maybeMs);
    // 12-hour time, no timezone text
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'TBD';
  }
}

function OutcomeBadge({ outcome }: { outcome: 'W' | 'L' | 'D' | '' }) {
  if (!outcome) return null;
  const base = 'text-xs font-semibold px-2 py-0.5 rounded';
  if (outcome === 'W')
    return <span className={`${base} bg-green-700 text-green-100`}>W</span>;
  if (outcome === 'L')
    return <span className={`${base} bg-red-800 text-red-100`}>L</span>;
  return <span className={`${base} bg-gray-700 text-gray-100`}>D</span>;
}

export default function TeamModal({
  teamId,
  onClose,
  recentLimit = DEFAULT_RECENT,
}: {
  teamId: number | string | null;
  onClose: () => void;
  recentLimit?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [recent, setRecent] = useState<RecentMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/team/${teamId}`);
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`API ${res.status} ${txt}`);
        }
        const json = await res.json();

        if (cancelled) return;

        // Expecting server route to return { team: {...}, recent_matches: [...] }
        setTeam(json.team ?? null);

        const rawMatches: any[] = Array.isArray(json.recent_matches)
          ? json.recent_matches
          : json.recent_matches?.data ?? [];
        // Normalize and limit
        const normalized: RecentMatch[] = (rawMatches ?? [])
          .map((m) => ({
            match_id:
              m.match_id ?? m.id ?? m.matchId ?? m.raw?.match_id ?? null,
            start_time:
              m.start_time ??
              m.start_at ??
              m.raw?.start_time ??
              m.raw?.start_at ??
              null,
            radiant_win:
              typeof m.radiant_win === 'boolean'
                ? m.radiant_win
                : m.raw?.radiant_win ?? null,
            radiant:
              typeof m.radiant === 'boolean'
                ? m.radiant
                : m.raw?.radiant ?? null,
            opposing_team_name:
              m.opposing_team_name ??
              m.opponent_name ??
              m.opponent?.name ??
              (m.raw?.opponents
                ? m.raw.opponents[0]?.opponent?.name ??
                  m.raw.opponents[1]?.opponent?.name
                : null) ??
              null,
            opposing_team_id: m.opposing_team_id ?? m.opponent?.id ?? null,
            score:
              m.score ??
              m.raw?.score ??
              (m.raw?.results
                ? m.raw.results.map((r: any) => r.score).join(':')
                : null),
            raw: m,
          }))
          .slice(0, recentLimit);

        setRecent(normalized);
      } catch (err: any) {
        if (!cancelled) setError(String(err.message ?? err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [teamId, recentLimit]);

  // small derived label for header
  const headerLabel = useMemo(() => {
    if (!team) return '';
    return team.tag ?? team.name ?? `Team ${team.id ?? ''}`;
  }, [team]);

  if (!teamId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl bg-[#0b0b0b] rounded-xl border border-gray-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '86vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
              {team?.logo_url ? (
                <Image
                  src={team.logo_url}
                  alt={team.name ?? 'team'}
                  width={40}
                  height={40}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-white">
                  {(team?.tag ?? team?.name ?? '').slice(0, 2)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold text-white truncate">
                {headerLabel}
              </div>
              <div className="text-sm text-gray-400 truncate">{team?.name}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div
          className="p-4 overflow-y-auto"
          style={{ maxHeight: 'calc(86vh - 72px)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1">
              <div className="text-xs text-gray-400">Rating</div>
              <div className="text-2xl font-bold text-white">
                {team?.rating ?? '—'}
              </div>

              <div className="mt-3 text-xs text-gray-400">Record</div>
              <div className="text-sm text-gray-100">
                {team?.wins ?? '—'}W <span className="text-gray-500">/</span>{' '}
                {team?.losses ?? '—'}L
              </div>

              <div className="mt-4 text-xs text-gray-500">Source: OpenDota</div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Recent matches</div>
                <div className="text-xs text-gray-500">
                  Showing {recent.length} of {recentLimit}
                </div>
              </div>

              {loading ? (
                <div className="py-6 text-center text-gray-400">Loading…</div>
              ) : error ? (
                <div className="py-6 text-center text-red-400">{error}</div>
              ) : recent.length === 0 ? (
                <div className="py-6 text-center text-gray-400">
                  No recent matches
                </div>
              ) : (
                <div className="space-y-3">
                  {recent.map((m) => {
                    // determine outcome (W/L/D) relative to this team
                    let outcome: 'W' | 'L' | 'D' | '' = '';
                    if (
                      typeof m.radiant_win === 'boolean' &&
                      typeof m.radiant === 'boolean'
                    ) {
                      outcome = m.radiant === m.radiant_win ? 'W' : 'L';
                    } else if (
                      m.raw &&
                      Array.isArray(m.raw.results) &&
                      m.raw.results.length > 0
                    ) {
                      // try to derive from results
                      const teamResult = (m.raw.results as any[]).find(
                        (r) =>
                          r.team_id ===
                          (m.opposing_team_id ? undefined : undefined)
                      );
                      // fallback - leave blank
                    }

                    const when = format12Hour(m.start_time);

                    return (
                      <div
                        key={String(
                          m.match_id ??
                            `${m.opposing_team_name ?? ''}-${
                              m.start_time ?? ''
                            }`
                        )}
                        className="flex items-center justify-between bg-[#0d0d0d] border border-gray-800 rounded px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-200 font-medium truncate">
                              {m.opposing_team_name ?? 'Opponent'}
                            </div>
                            <OutcomeBadge outcome={outcome} />
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {when}
                          </div>
                        </div>

                        <div className="ml-4 text-sm text-gray-200 font-medium">
                          {m.score ??
                            (m.raw?.results
                              ? m.raw.results.map((r: any) => r.score).join(':')
                              : '—')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* optional extra details */}
          <div className="text-xs text-gray-500">
            Tip: open a match from the match list to see map & draft details (if
            available).
          </div>
        </div>
      </div>
    </div>
  );
}
