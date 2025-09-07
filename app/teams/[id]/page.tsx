// app/teams/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';

type AnyObj = Record<string, any>;

/**
 * Team page:
 * - Fetches team info from OpenDota: /teams/{id}
 * - Fetches recent matches for team: /teams/{id}/matches (limit 10)
 * - Simple in-memory cache to reduce repeated calls during dev
 */

const TEAM_URL = (id: number | string) =>
  `https://api.opendota.com/api/teams/${id}`;
const TEAM_MATCHES_URL = (id: number | string, limit = 10) =>
  `https://api.opendota.com/api/teams/${id}/matches?limit=${limit}`;

/* Simple in-process cache (ttl ms) */
const teamCache = new Map<number | string, { ts: number; data: AnyObj }>();
const TEAM_CACHE_TTL = 60 * 1000; // 60s

async function fetchJson(url: string, timeoutMs = 10000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[fetchJson] ${url} returned ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[fetchJson] ${url} failed:`, err?.message ?? err);
    return null;
  }
}

/* small helper for country flag (ISO2) */
function flagUrlFromISO2(cc?: string | null) {
  if (!cc) return null;
  const code = cc.slice(0, 2).toLowerCase();
  return `https://flagcdn.com/16x12/${code}.png`;
}

/* sanitize */
function sanitizeUrl(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.startsWith('/')) return `https://api.opendota.com${s}`;
  if (s.startsWith('http://')) return 'https://' + s.slice(7);
  return s;
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // check cache
  const cached = teamCache.get(id);
  const now = Date.now();
  if (cached && now - cached.ts < TEAM_CACHE_TTL) {
    // use cached
    const payload = cached.data;
    return <TeamView team={payload.team} recentMatches={payload.matches} />;
  }

  // fetch team info + recent matches
  const [teamData, recentMatches] = await Promise.all([
    fetchJson(TEAM_URL(id)),
    fetchJson(TEAM_MATCHES_URL(id, 10)),
  ]);

  const team = teamData ?? null;
  const matches = Array.isArray(recentMatches) ? recentMatches : [];

  // store cache
  teamCache.set(id, { ts: Date.now(), data: { team, matches } });

  return <TeamView team={team} recentMatches={matches} />;
}

/* presentational component (can be server) */
function TeamView({
  team,
  recentMatches,
}: {
  team: AnyObj | null;
  recentMatches: AnyObj[];
}) {
  if (!team) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-white">Team not found</h2>
        <p className="text-gray-400 mt-2">
          OpenDota did not return a team for this id.
        </p>
        <div className="mt-4">
          <Link href="/">
            <span className="text-sm text-gray-400 hover:text-white">
              ← Back
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const teamId = team.team_id ?? team.id;
  const name = team.name ?? team.tag ?? team.tag_name ?? 'Unknown';
  const tag = team.tag ?? team.tag_name ?? null;
  const logo = sanitizeUrl(
    team.logo_url ?? team.logo ?? team.image_url ?? team.image ?? null
  );
  // country may be in team.location or team.country (OpenDota may not provide)
  const country = (team.location ?? team.country ?? null) as string | null;
  const flag = flagUrlFromISO2(country ?? undefined);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800">
          {logo ? (
            <ImageWithFallback src={logo} alt={name} width={64} height={64} />
          ) : (
            <div className="w-16 h-16 bg-gray-700 flex items-center justify-center text-white">
              T
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{name}</h1>
            {tag ? (
              <span className="text-xs text-gray-400 px-2 py-1 bg-[#121212] rounded">
                {tag}
              </span>
            ) : null}
            {flag ? (
              <ImageWithFallback src={flag} alt="flag" width={16} height={12} />
            ) : null}
          </div>
          <div className="text-sm text-gray-400 mt-1">Team ID: {teamId}</div>
        </div>
      </header>

      <section className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">
          Recent matches
        </h2>
        {recentMatches.length === 0 ? (
          <div className="text-gray-400">No recent matches found.</div>
        ) : (
          <div className="space-y-3">
            {recentMatches.slice(0, 10).map((m: AnyObj) => {
              const matchId =
                m.match_id ?? m.match_id ?? m.id ?? m.game_id ?? m.match_id;
              const name =
                m.name ??
                `${m.radiant_name ?? 'Radiant'} vs ${m.dire_name ?? 'Dire'}`;
              const status =
                m.status ?? m.radiant_win != null ? 'finished' : 'scheduled';
              const start =
                m.start_time ?? m.scheduled_at ?? m.begin_at ?? m.scheduled_at;
              const radiant = m.radiant_name ?? m.radiant_team?.name ?? null;
              const dire = m.dire_name ?? m.dire_team?.name ?? null;
              const score =
                typeof m.radiant_score === 'number' &&
                typeof m.dire_score === 'number'
                  ? `${m.radiant_score} - ${m.dire_score}`
                  : m.score ?? null;

              return (
                <Link
                  key={String(matchId) + (m._id ?? '')}
                  href={`/matches/${matchId ?? m.id ?? ''}`}
                  className="block p-3 bg-[#121212] border border-gray-800 rounded hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-200 truncate">
                        {name}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-1">
                        {radiant && dire
                          ? `${radiant} vs ${dire}`
                          : start
                          ? new Date(start * 1000 || start).toLocaleString()
                          : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">
                        {score ?? '—'}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          status === 'running'
                            ? 'text-red-400'
                            : status === 'finished'
                            ? 'text-green-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {status === 'running'
                          ? 'Live'
                          : status === 'finished'
                          ? 'Finished'
                          : 'Scheduled'}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-4">
        <Link href="/">
          <span className="text-sm text-gray-400 hover:text-white">
            ← Back to matches
          </span>
        </Link>
      </div>
    </div>
  );
}
