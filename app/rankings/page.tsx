// app/rankings/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Download, Search, ArrowUpDown } from 'lucide-react';
import TeamModal from '@/components/TeamModal';

type RankingRow = {
  rank: number;
  teamId: number;
  team: {
    id?: number;
    name?: string | null;
    acronym?: string | null;
    tag?: string | null;
    image_url?: string | null;
    logo_url?: string | null;
    slug?: string | null;
    // possible country fields from various APIs
    location?: string | null; // sometimes "US" or "United States"
    country?: string | null;
    location_code?: string | null;
  } | null;
  wins: number;
  losses: number;
  played: number;
  winRate: number;
};

const PAGE_SIZE = 30;

/** Convert 2-letter ISO country code to regional indicator symbol emoji
 *  e.g. "US" -> 🇺🇸
 *  Returns '' if input invalid.
 */
function countryCodeToEmoji(code?: string | null) {
  if (!code) return '';
  const c = String(code).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  return c
    .split('')
    .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
    .join('');
}

/** Try to derive an ISO2 code from likely fields.
 * - If field looks like 2-letter code, return it.
 * - If it's a full name (e.g. "United States") we can't reliably map without a lookup table;
 *   so return null in that case. If you prefer mapping names -> codes, I can add a small map.
 */
function getCountryCodeFromTeam(team: any): string | null {
  if (!team) return null;

  // common fields: location, country, location_code
  const candidates = [
    team.location,
    team.country,
    team.location_code,
    team.country_code,
    team.iso2,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const s = String(raw).trim();
    // if it's already ISO2 (two letters), return
    if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
    // if it's like "US" with punctuation/whitespace, try extract 2 letters
    const letters = s.match(/[A-Za-z]{2}/);
    if (letters && letters[0].length === 2) return letters[0].toUpperCase();
    // else probably a full country name -> skip (we could add mapping, see note)
  }

  // Some APIs put country as an object: { id, name, code }
  if (team.country && typeof team.country === 'object') {
    const maybe = (team.country.code ??
      team.country.iso2 ??
      team.country.id ??
      team.country.name) as string | undefined;
    if (maybe && /^[A-Za-z]{2}$/.test(maybe)) return maybe.toUpperCase();
  }

  return null;
}

export default function RankingsPage() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // ui state
  const [query, setQuery] = useState('');
  const [minMatches, setMinMatches] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'rank' | 'wins' | 'winRate' | 'played'>(
    'rank'
  );
  const [desc, setDesc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(initial = false) {
      try {
        if (initial) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', String(PAGE_SIZE));
        params.set('game', 'dota2');

        const res = await fetch(`/api/rankings?${params.toString()}`);
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`API ${res.status} ${txt}`);
        }
        const json = await res.json();
        const incoming: any[] = Array.isArray(json)
          ? json
          : json.rankings ?? json.data ?? [];

        const normalized: RankingRow[] = incoming.map(
          (it: any, idx: number) => {
            const team = it.team ?? {
              id: it.team_id,
              name: it.name,
              tag: it.tag,
              logo_url: it.logo_url,
              location: it.location,
              country: it.country,
              location_code: it.location_code,
            };
            const wins = Number(it.wins ?? 0);
            const losses = Number(it.losses ?? 0);
            const played = wins + losses;
            const winRate = played ? wins / played : 0;
            return {
              rank: Number(it.rank ?? idx + 1),
              teamId: team.id ?? idx + 1,
              team: {
                id: team.id,
                name: team.name,
                acronym: team.acronym ?? team.tag,
                tag: team.tag,
                image_url: team.image_url ?? team.logo_url,
                logo_url: team.logo_url ?? team.image_url,
                slug: team.slug,
                location: team.location,
                country: team.country,
                location_code: team.location_code,
              } as any,
              wins,
              losses,
              played,
              winRate,
            };
          }
        );

        if (initial) setRows(normalized);
        else setRows((prev) => [...prev, ...normalized]);

        setHasMore(normalized.length === PAGE_SIZE);
      } catch (err: any) {
        console.error('Failed to load rankings', err);
        setError(String(err.message ?? err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }

    load(page === 1);
    return () => {
      cancelled = true;
    };
  }, [page]);

  const visible = useMemo(() => {
    let list = rows.slice();
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) => {
        const name = (r.team?.name ?? '').toLowerCase();
        const acro = (r.team?.acronym ?? r.team?.tag ?? '').toLowerCase();
        const slug = (r.team?.slug ?? '').toLowerCase();
        return name.includes(q) || acro.includes(q) || slug.includes(q);
      });
    }
    if (typeof minMatches === 'number' && minMatches > 0) {
      list = list.filter((r) => r.played >= minMatches);
    }
    list.sort((a, b) => {
      let av = 0,
        bv = 0;
      if (sortBy === 'rank') {
        av = a.rank;
        bv = b.rank;
      } else if (sortBy === 'wins') {
        av = a.wins;
        bv = b.wins;
      } else if (sortBy === 'winRate') {
        av = a.winRate;
        bv = b.winRate;
      } else if (sortBy === 'played') {
        av = a.played;
        bv = b.played;
      }
      return desc ? bv - av : av - bv;
    });
    return list;
  }, [rows, query, minMatches, sortBy, desc]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) setDesc(!desc);
    else {
      setSortBy(field);
      setDesc(false);
    }
  };

  // CSV export helper
  const exportCsv = () => {
    const header = [
      'Rank',
      'Team',
      'Acronym',
      'Wins',
      'Losses',
      'Played',
      'WinRate',
    ];
    const csv =
      header.join(',') +
      '\n' +
      visible
        .map((r) =>
          [
            r.rank,
            `"${(r.team?.name ?? '').replace(/"/g, '""')}"`,
            `"${(r.team?.acronym ?? '').replace(/"/g, '""')}"`,
            r.wins,
            r.losses,
            r.played,
            `${Math.round(r.winRate * 100)}%`,
          ].join(',')
        )
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dota2_rankings_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        {/* Left: Title */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            Dota 2 — Team Rankings
          </h1>
          <p className="text-sm text-gray-400 mt-1">Click a row for details</p>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex items-center bg-[#1a1a1a] border border-gray-800 rounded-md px-3 py-1 flex-grow min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              aria-label="Search teams"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team or tag"
              className="bg-transparent ml-2 outline-none text-sm text-gray-200 placeholder-gray-500 w-full"
            />
          </div>

          {/* Min matches */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-gray-800 rounded-md px-2 py-1 flex-shrink-0">
            <label className="text-xs text-gray-400">Min</label>
            <input
              type="number"
              min={0}
              value={minMatches === '' ? '' : String(minMatches)}
              onChange={(e) =>
                setMinMatches(
                  e.target.value === ''
                    ? ''
                    : Math.max(0, Number(e.target.value))
                )
              }
              className="w-16 bg-transparent outline-none text-sm text-gray-200 placeholder-gray-500"
            />
          </div>

          {/* Export */}
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[64px_1fr_96px_96px_96px] text-sm text-gray-400 px-4 py-3 border-b border-gray-800 items-center">
          <div className="flex items-center gap-2">
            <span>#</span>
            <button
              onClick={() => handleSort('rank')}
              className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
            >
              Rank <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
          <div>Team</div>
          <div className="text-right">Wins</div>
          <div className="text-right">Played</div>
          <div className="text-right">Win %</div>
        </div>

        {/* Rows */}
        <div>
          {loading && rows.length === 0 ? (
            <div className="p-4 text-center text-gray-400">Loading…</div>
          ) : error ? (
            <div className="p-4 text-center text-red-400">{error}</div>
          ) : visible.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No teams match your filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {visible.map((r) => {
                const logo = r.team?.image_url ?? r.team?.logo_url ?? null;
                const fullName = r.team?.name ?? 'Unknown Team';
                const smallTag = r.team?.acronym ?? r.team?.tag ?? '';
                const displayName =
                  r.team?.acronym ?? r.team?.tag ?? r.team?.name ?? 'Unknown';
                const key = `${r.teamId}-${displayName}`;

                // Country/flag
                const cc = getCountryCodeFromTeam(r.team);
                const flag = countryCodeToEmoji(cc);
                const flagLabel = cc ? `Country: ${cc}` : '';

                return (
                  <div
                    key={key}
                    role="button"
                    onClick={() => setSelectedTeamId(r.teamId)}
                    className="grid grid-cols-[64px_1fr_96px_96px_96px] items-center px-3 py-3 md:px-4 md:py-3 hover:bg-[#121212] transition"
                  >
                    {/* Rank */}
                    <div className="text-gray-300 text-sm font-medium">
                      {r.rank}
                    </div>

                    {/* Team cell: larger square logo + name; tag as badge right; flag emoji */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-md bg-gray-800 flex items-center justify-center flex-shrink-0 p-1 overflow-hidden">
                        {logo ? (
                          <Image
                            src={logo}
                            alt={fullName}
                            width={56}
                            height={56}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-white">
                            {String(displayName).slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Flag emoji (if available) */}
                            {flag ? (
                              <span
                                className="text-lg leading-none"
                                role="img"
                                aria-label={flagLabel}
                              >
                                {flag}
                              </span>
                            ) : null}

                            <div
                              className="text-base font-semibold text-gray-100 truncate"
                              title={fullName}
                              aria-label={fullName}
                            >
                              {fullName}
                            </div>
                          </div>

                          {/* Acronym / small tag on the right */}
                          {smallTag ? (
                            <div className="ml-2 flex-shrink-0">
                              <span className="inline-block text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-200 px-2 py-0.5 rounded">
                                {smallTag}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {r.team?.slug ?? ''}
                        </div>
                      </div>
                    </div>

                    {/* Wins */}
                    <div className="text-right text-sm text-gray-200 font-medium">
                      {r.wins}
                    </div>

                    {/* Played */}
                    <div className="text-right text-sm text-gray-200 font-medium">
                      {r.played}
                    </div>

                    {/* Win rate */}
                    <div className="text-right text-sm text-gray-200 font-medium">
                      {Math.round(r.winRate * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            {rows.length > 0 ? `${rows.length} teams fetched` : 'No data'}
          </div>

          <div>
            {loadingMore ? (
              <div className="inline-flex items-center gap-2 bg-gray-800 px-3 py-2 rounded text-gray-300">
                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />{' '}
                Loading...
              </div>
            ) : hasMore ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Load more
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedTeamId && (
        <TeamModal
          teamId={selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
        />
      )}
    </div>
  );
}
