// app/page.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LoadMoreButton from '@/components/LoadMoreButton';

type OpenDotaProMatch = {
  match_id: number;
  radiant_name?: string | null;
  dire_name?: string | null;
  radiant_score?: number | null;
  dire_score?: number | null;
  start_time?: number | null; // unix seconds
  league_name?: string | null;
  tournament?: { id?: number; name?: string } | null;
  radiant_team_id?: number | null;
  dire_team_id?: number | null;
  radiant_win?: boolean | null;
  name?: string | null;
};

type TeamInfo = {
  team_id?: number;
  name?: string;
  tag?: string | null;
  logo_url?: string | null;
};

const DEFAULT_PAGE_SIZE = 20;

const toMs = (unixSeconds?: number | null) =>
  typeof unixSeconds === 'number' ? unixSeconds * 1000 : null;

function format12Hour(msOrNull?: number | null) {
  if (!msOrNull) return 'TBD';
  try {
    const d = new Date(msOrNull);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'TBD';
  }
}

function getStatusFromMatch(m: {
  radiantScore?: number | null;
  direScore?: number | null;
  startTime?: number | null;
  radiantWin?: boolean | null;
}) {
  const now = Date.now();
  const startMs = m.startTime ?? null;
  const hasScores =
    typeof m.radiantScore === 'number' || typeof m.direScore === 'number';
  if (typeof m.radiantWin === 'boolean') return 'finished';
  if (startMs && startMs <= now && hasScores) return 'running';
  if (startMs && startMs > now) return 'scheduled';
  if (hasScores) return 'running';
  return 'scheduled';
}

function statusPill(status: string) {
  if (status === 'running')
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Live
      </span>
    );
  if (status === 'finished')
    return (
      <span className="inline-flex items-center text-xs font-semibold text-green-400">
        Finished
      </span>
    );
  return (
    <span className="inline-flex items-center text-xs font-semibold text-blue-300">
      Scheduled
    </span>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { count?: string };
}) {
  const countParam =
    Number(searchParams?.count ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

  // Fetch pro matches (server-side); defensive
  let proJson: OpenDotaProMatch[] = [];
  try {
    const proRes = await fetch(`https://api.opendota.com/api/proMatches`, {
      next: { revalidate: 60 },
    });
    if (proRes.ok) proJson = (await proRes.json()) as OpenDotaProMatch[];
    else {
      console.error('OpenDota /proMatches returned', proRes.status);
      proJson = [];
    }
  } catch (err) {
    console.error('Network error fetching proMatches:', err);
    proJson = [];
  }

  // slice to desired count (server-side)
  const sliced = proJson.slice(0, Math.max(countParam, DEFAULT_PAGE_SIZE));

  // Collect team ids then fetch team info in parallel
  const teamIds = new Set<number>();
  for (const m of sliced) {
    if (m.radiant_team_id) teamIds.add(m.radiant_team_id);
    if (m.dire_team_id) teamIds.add(m.dire_team_id);
  }

  const teamFetches: Promise<[number, TeamInfo | null]>[] = Array.from(
    teamIds
  ).map(async (id) => {
    try {
      const r = await fetch(`https://api.opendota.com/api/teams/${id}`, {
        next: { revalidate: 3600 },
      });
      if (!r.ok) return [id, null];
      const j = (await r.json()) as TeamInfo;
      return [id, j];
    } catch (err) {
      console.warn('Team fetch failed for', id, err);
      return [id, null];
    }
  });

  const teamEntries = await Promise.all(teamFetches);
  const teamMap = new Map<number, TeamInfo | null>(teamEntries);

  // Normalize view model
  const matchesView = sliced.map((m) => {
    const startTimeMs = toMs(m.start_time ?? null);
    const tournamentName = (m as any).tournament?.name ?? m.league_name ?? null;
    return {
      id: m.match_id,
      name: m.name ?? null,
      radiantName: m.radiant_name ?? null,
      direName: m.dire_name ?? null,
      radiantScore:
        typeof m.radiant_score === 'number' ? m.radiant_score : null,
      direScore: typeof m.dire_score === 'number' ? m.dire_score : null,
      startTime: startTimeMs,
      tournament: tournamentName,
      radiantTeamId: m.radiant_team_id ?? null,
      direTeamId: m.dire_team_id ?? null,
      radiantWin: typeof m.radiant_win === 'boolean' ? m.radiant_win : null,
    };
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Live & Recent Dota 2 Pro Matches
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Data refreshed server-side (cached 60s)
          </p>
        </div>
      </header>

      <div className="space-y-4">
        {matchesView.map((m) => {
          const status = getStatusFromMatch({
            radiantScore: m.radiantScore,
            direScore: m.direScore,
            startTime: m.startTime,
            radiantWin: m.radiantWin,
          });

          const radiantTeam = m.radiantTeamId
            ? teamMap.get(m.radiantTeamId) ?? null
            : null;
          const direTeam = m.direTeamId
            ? teamMap.get(m.direTeamId) ?? null
            : null;

          return (
            <article
              key={m.id}
              className="rounded-xl overflow-hidden border border-gray-800 bg-[#0f0f0f] shadow-sm hover:shadow-lg transition"
            >
              {/* Card header: tournament / league name */}
              <div className="px-4 py-2 bg-[#111111] border-b border-gray-800 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-200 truncate">
                  {m.tournament ?? 'Unknown Tournament'}
                </div>
                <div className="text-xs text-gray-400">
                  {statusPill(status)}
                </div>
              </div>

              {/* Clickable main area (internal link) */}
              <Link
                href={`/matches/${m.id}`}
                className="block"
                prefetch={false}
              >
                <div className="p-4 flex flex-col md:flex-row items-center md:items-stretch justify-between gap-4">
                  {/* Teams */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Radiant */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden p-1">
                        {radiantTeam?.logo_url ? (
                          <Image
                            src={radiantTeam.logo_url}
                            alt={radiantTeam.name ?? m.radiantName ?? 'Radiant'}
                            width={56}
                            height={56}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="text-sm text-white">
                            {(m.radiantName ?? 'R').slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-100 truncate">
                          {m.radiantName ?? radiantTeam?.name ?? 'Radiant'}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {radiantTeam?.tag ?? ''}
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:block text-gray-500">vs</div>

                    {/* Dire */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden p-1">
                        {direTeam?.logo_url ? (
                          <Image
                            src={direTeam.logo_url}
                            alt={direTeam.name ?? m.direName ?? 'Dire'}
                            width={56}
                            height={56}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="text-sm text-white">
                            {(m.direName ?? 'D').slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-100 truncate">
                          {m.direName ?? direTeam?.name ?? 'Dire'}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {direTeam?.tag ?? ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score & meta */}
                  <div className="flex flex-col items-center md:items-end gap-2">
                    <div className="text-2xl font-bold text-white">
                      {status === 'scheduled'
                        ? '--'
                        : `${m.radiantScore ?? 0} - ${m.direScore ?? 0}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      {status === 'running' ? (
                        <span className="text-red-400 font-semibold">Live</span>
                      ) : status === 'finished' ? (
                        <span className="text-green-400 font-semibold">
                          Finished
                        </span>
                      ) : (
                        format12Hour(m.startTime)
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {/* Load More (client component) */}
      <div className="flex justify-center mt-6">
        <LoadMoreButton currentCount={countParam} />
      </div>
    </div>
  );
}
