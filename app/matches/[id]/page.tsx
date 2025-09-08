// app/matches/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Clock } from 'lucide-react';
import ImageWithFallback from '@/components/ImageWithFallback'; // if you have it — otherwise both places use <img> fallback

type MatchDetail = any;
type HeroMeta = {
  id: number;
  name: string;
  localized_name: string;
  img_full?: string;
  icon_full?: string;
};

export default function MatchPageClient({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [heroes, setHeroes] = useState<Record<number | string, HeroMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // fetch hero metadata
        const [hRes, mRes] = await Promise.all([
          fetch('/api/heroes'),
          fetch(`/api/matches/${id}`),
        ]);
        if (!hRes.ok) {
          const txt = await hRes.text().catch(() => '');
          throw new Error(`/api/heroes error: ${hRes.status} ${txt}`);
        }
        if (!mRes.ok) {
          const txt = await mRes.text().catch(() => '');
          throw new Error(`/api/matches/${id} error: ${mRes.status} ${txt}`);
        }

        const heroesArr = await hRes.json();
        const heroMap: Record<string | number, HeroMeta> = {};
        for (const h of heroesArr) {
          if (h && typeof h.id !== 'undefined') {
            heroMap[h.id] = h;
            // also attempt keyed by localized_name or name if you prefer later
            heroMap[h.name] = h;
            heroMap[h.localized_name] = h;
          }
        }

        const mjson = await mRes.json();
        if (!mounted) return;
        setHeroes(heroMap);
        setMatch(mjson);
      } catch (err: any) {
        console.error('Failed loading match detail or heroes', err);
        setError(err?.message ?? 'Failed to load match details');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 bg-[#111] w-48 mb-4 rounded" />
        <div className="space-y-3">
          <div className="h-28 bg-[#121212] rounded-xl animate-pulse" />
          <div className="h-48 bg-[#121212] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-6">
        <div className="text-gray-300">Match not found.</div>
      </div>
    );
  }

  // helper to resolve hero image — picks might store hero id or name
  function heroImgFor(value: any) {
    if (value == null) return null;
    // If value is numeric hero id
    if (typeof value === 'number' && heroes[value])
      return heroes[value].img_full ?? heroes[value].icon_full ?? null;
    // If value is string (like "npc_dota_hero_antimage" or localized name)
    if (typeof value === 'string') {
      const h =
        heroes[value] ??
        Object.values(heroes).find(
          (hh) => hh.localized_name === value || hh.name === value
        );
      if (h) return h.img_full ?? h.icon_full ?? null;
      // sometimes picks are 'antimage' — try to find by endsWith
      const found = Object.values(heroes).find(
        (hh) =>
          hh.name?.endsWith(value) ||
          hh.localized_name?.toLowerCase() === value.toLowerCase()
      );
      if (found) return found.img_full ?? found.icon_full ?? null;
    }
    return null;
  }

  const winnerId = match.winner_id ?? match.winner?.id ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header: tournament name + league + game badge */}
      <header className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400">
            {match.league?.name ??
              match.raw?.league?.name ??
              match.raw?.tournament?.name}
          </div>
          <h1 className="text-2xl font-bold text-white">{match.name}</h1>
          <div className="text-xs text-gray-400 mt-1">
            {match.status === 'running' ? (
              <span className="flex items-center text-red-400">
                <Trophy className="h-4 w-4 mr-2 text-red-400" /> Live
              </span>
            ) : match.status === 'not_started' ? (
              <span className="flex items-center text-blue-400">
                <Clock className="h-4 w-4 mr-2" /> Scheduled
              </span>
            ) : (
              <span className="text-green-400">Finished</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">
            {match.videogame?.slug ?? 'Dota 2'}
          </div>
          <div className="text-xs text-gray-400">
            {match.scheduled_at
              ? new Date(match.scheduled_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : ''}
          </div>
        </div>
      </header>

      {/* Score card */}
      <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Team A */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
              {match.opponents?.[0]?.opponent?.image_url ? (
                // using <img> here to avoid next/image host config issues
                <img
                  src={match.opponents[0].opponent.image_url}
                  alt={match.opponents[0].opponent.name}
                  width={56}
                  height={56}
                  className="object-contain"
                />
              ) : (
                <div className="w-14 h-14 bg-gray-700 flex items-center justify-center text-xs text-white">
                  T
                </div>
              )}
            </div>
            <div className="text-left">
              <div
                className={`text-lg font-semibold ${
                  winnerId && match.opponents?.[0]?.opponent?.id === winnerId
                    ? 'text-green-400'
                    : 'text-white'
                }`}
              >
                {match.opponents?.[0]?.opponent?.acronym ??
                  match.opponents?.[0]?.opponent?.name}
                {winnerId &&
                  match.opponents?.[0]?.opponent?.id === winnerId && (
                    <span className="ml-2 text-yellow-400">🏆</span>
                  )}
              </div>
              <div className="text-xs text-gray-400">
                {/* optional country or tag */}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-white">
            {(match.score && match.score[0] != null) ||
            (match.score && match.score[1] != null)
              ? `${match.score?.[0] ?? 0} - ${match.score?.[1] ?? 0}`
              : '--'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {match.status === 'running'
              ? 'Live'
              : match.status === 'finished'
              ? 'Finished'
              : 'Scheduled'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Team B */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div
                className={`text-lg font-semibold ${
                  winnerId && match.opponents?.[1]?.opponent?.id === winnerId
                    ? 'text-green-400'
                    : 'text-white'
                }`}
              >
                {match.opponents?.[1]?.opponent?.acronym ??
                  match.opponents?.[1]?.opponent?.name}
                {winnerId &&
                  match.opponents?.[1]?.opponent?.id === winnerId && (
                    <span className="ml-2 text-yellow-400">🏆</span>
                  )}
              </div>
              <div className="text-xs text-gray-400" />
            </div>
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
              {match.opponents?.[1]?.opponent?.image_url ? (
                <img
                  src={match.opponents[1].opponent.image_url}
                  alt={match.opponents[1].opponent.name}
                  width={56}
                  height={56}
                  className="object-contain"
                />
              ) : (
                <div className="w-14 h-14 bg-gray-700 flex items-center justify-center text-xs text-white">
                  T
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Picks / Drafts */}
      {match.picks && Array.isArray(match.picks) && (
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Hero Picks / Draft
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Try to render picks grouped by team if possible */}
            <div>
              <div className="text-xs text-gray-400 mb-1">Team A</div>
              <div className="flex flex-wrap gap-2">
                {match.picks.map((p: any, idx: number) => {
                  // picks might be objects or hero ids/strings
                  const heroKey = p.heroId ?? p.hero_id ?? p.hero ?? p;
                  const img = heroImgFor(heroKey);
                  return (
                    <div
                      key={`a-${idx}`}
                      className="w-14 h-14 rounded overflow-hidden bg-[#121212] border border-gray-800 flex items-center justify-center"
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={String(heroKey)}
                          className="object-contain w-full h-full"
                        />
                      ) : (
                        <div className="text-xs text-gray-400">Hero</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Team B</div>
              <div className="flex flex-wrap gap-2">
                {/* If picks structure contains sides, attempt to show second team's picks; otherwise duplicate */}
                {match.picksB && Array.isArray(match.picksB)
                  ? match.picksB.map((p: any, idx: number) => {
                      const heroKey = p.heroId ?? p.hero_id ?? p.hero ?? p;
                      const img = heroImgFor(heroKey);
                      return (
                        <div
                          key={`b-${idx}`}
                          className="w-14 h-14 rounded overflow-hidden bg-[#121212] border border-gray-800 flex items-center justify-center"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={String(heroKey)}
                              className="object-contain w-full h-full"
                            />
                          ) : (
                            <div className="text-xs text-gray-400">Hero</div>
                          )}
                        </div>
                      );
                    })
                  : match.picks.map((p: any, idx: number) => {
                      const heroKey = p.heroId ?? p.hero_id ?? p.hero ?? p;
                      const img = heroImgFor(heroKey);
                      return (
                        <div
                          key={`bdup-${idx}`}
                          className="w-14 h-14 rounded overflow-hidden bg-[#121212] border border-gray-800 flex items-center justify-center"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={String(heroKey)}
                              className="object-contain w-full h-full"
                            />
                          ) : (
                            <div className="text-xs text-gray-400">Hero</div>
                          )}
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maps / Game breakdown */}
      {match.maps && (
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Maps / Games
          </h3>
          <div className="space-y-2">
            {Array.isArray(match.maps) ? (
              match.maps.map((map: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[#121212] p-3 rounded"
                >
                  <div className="text-sm text-gray-200">
                    {map.mapName ?? map.name ?? `Game ${idx + 1}`}
                  </div>
                  <div className="text-sm text-gray-300">
                    {map.teamAScore != null
                      ? `${map.teamAScore} - ${map.teamBScore}`
                      : map.result ?? '--'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-400">No map breakdown available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
