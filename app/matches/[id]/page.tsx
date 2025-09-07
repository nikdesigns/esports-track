// app/matches/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';

type OpenDotaMatch = any;

/* --------------------
   Config / endpoints
   -------------------- */
const MATCH_URL = (id: string | number) =>
  `https://api.opendota.com/api/matches/${id}`;
const HEROES_URL = 'https://api.opendota.com/api/constants/heroes';
const ITEMS_URL = 'https://api.opendota.com/api/constants/items';

/* --------------------
   Helpers
   -------------------- */

// convert seconds -> ms
const toMs = (unixSeconds?: number | null) =>
  typeof unixSeconds === 'number' ? unixSeconds * 1000 : null;

// sanitize OpenDota returned paths or full URLs to absolute https and remove stray '?' or '&'
function sanitizeOpenDotaUrl(raw?: string | null) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  // Strip trailing ? or &
  while (s.endsWith('?') || s.endsWith('&')) s = s.slice(0, -1);
  // If given a path (starts with /) prefix with api.opendota.com
  if (s.startsWith('/')) s = `https://api.opendota.com${s}`;
  // Normalize http -> https
  if (s.startsWith('http://')) s = 'https://' + s.slice(7);
  return s || null;
}

/**
 * hero constants -> lookup by numeric hero id
 * heroesJson is the raw object from /constants/heroes
 * returns { name, url } where url is sanitized absolute url (or null)
 */
function getHeroImageById(
  heroesJson: Record<string, any> | null,
  heroId?: number | null
) {
  if (!heroId || !heroesJson)
    return { name: `Hero ${heroId ?? ''}`, url: null };
  for (const key of Object.keys(heroesJson)) {
    const obj = (heroesJson as any)[key];
    if (!obj) continue;
    if (obj.id === heroId) {
      // prefer img (larger), fallback to icon
      const raw = obj.img ?? obj.icon ?? null;
      const url = sanitizeOpenDotaUrl(raw);
      const name = obj.localized_name ?? obj.name ?? key;
      return { name, url };
    }
  }
  return { name: `Hero ${heroId}`, url: null };
}

/**
 * Build item map from /constants/items. Keys are internal names (e.g. 'blink').
 */
function buildItemMap(itemsJson: Record<string, any> | null) {
  const map = new Map<string, { dname?: string; img?: string }>();
  if (!itemsJson) return map;
  for (const key of Object.keys(itemsJson)) {
    const it = itemsJson[key];
    if (!it) continue;
    const img =
      typeof it.img === 'string' ? sanitizeOpenDotaUrl(it.img) : undefined;
    map.set(key, { dname: it.dname ?? it.name ?? key, img });
  }
  return map;
}

/**
 * Safe lookup for an item key (player.item_0 etc). Handles strings only.
 */
function getItemFromKey(
  key: string | number | null | undefined,
  itemMap: Map<string, { dname?: string; img?: string }>
) {
  if (!key) return null;
  if (typeof key !== 'string') return null;
  const direct = itemMap.get(key);
  if (direct) return direct;
  const stripped = key.replace(/^item_/, '');
  const val = itemMap.get(stripped);
  if (val) return val;
  return { dname: key, img: null };
}

function formatTime12Hour(msOrNull?: number | null) {
  if (!msOrNull) return 'TBD';
  try {
    return new Date(msOrNull).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'TBD';
  }
}

function formatDuration(sec?: number | null) {
  if (!sec || sec <= 0) return '—';
  const s = Math.floor(sec);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0)
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/* --------------------
   Page component
   -------------------- */
export default async function MatchPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Defensive parallel fetch (match, heroes, items)
  let matchJson: OpenDotaMatch | null = null;
  let heroesJson: Record<string, any> | null = null;
  let itemsJson: Record<string, any> | null = null;
  try {
    const [mRes, hRes, iRes] = await Promise.allSettled([
      fetch(MATCH_URL(id), { next: { revalidate: 30 } }),
      fetch(HEROES_URL, { next: { revalidate: 3600 } }),
      fetch(ITEMS_URL, { next: { revalidate: 3600 } }),
    ]);

    if (mRes.status === 'fulfilled') {
      const r = mRes.value as Response;
      if (r.ok) matchJson = await r.json();
      else {
        const txt = await r.text().catch(() => '');
        console.error('Match fetch failed', r.status, txt);
      }
    } else {
      console.error('Match fetch rejected', mRes.reason);
    }

    if (hRes.status === 'fulfilled') {
      const r = hRes.value as Response;
      if (r.ok) heroesJson = await r.json();
      else
        console.warn(
          'Heroes constants fetch non-OK',
          (hRes.value as Response).status
        );
    } else console.warn('Heroes fetch rejected', hRes.reason);

    if (iRes.status === 'fulfilled') {
      const r = iRes.value as Response;
      if (r.ok) itemsJson = await r.json();
      else
        console.warn(
          'Items constants fetch non-OK',
          (iRes.value as Response).status
        );
    } else console.warn('Items fetch rejected', iRes.reason);
  } catch (err) {
    console.error('Unexpected fetch error', err);
  }

  if (!matchJson) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Match {id}</h1>
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-300">
          <p>
            Unable to load match details from OpenDota. Check server logs for
            details.
          </p>
        </div>
        <div className="mt-4">
          <Link href="/">
            <span className="text-xs text-gray-400 hover:text-white">
              ← Back to matches
            </span>
          </Link>
        </div>
      </div>
    );
  }

  // Build maps
  const itemMap = buildItemMap(itemsJson);
  // Prepare players and other computed fields
  const match = matchJson;
  const radiantName =
    match.radiant_name ?? match.radiant_team?.name ?? 'Radiant';
  const direName = match.dire_name ?? match.dire_team?.name ?? 'Dire';
  const radiantScore =
    typeof match.radiant_score === 'number' ? match.radiant_score : null;
  const direScore =
    typeof match.dire_score === 'number' ? match.dire_score : null;
  const duration = typeof match.duration === 'number' ? match.duration : null;
  const startTimeMs = toMs(match.start_time ?? null);
  const league = match.league_name ?? match.league_id ?? null;
  const tournament =
    match.tournament ?? match.tournament?.name ?? match.tournament_id ?? null;
  const winnerside =
    match.radiant_win === true
      ? 'radiant'
      : match.radiant_win === false
      ? 'dire'
      : null;
  const players: any[] = Array.isArray(match.players) ? match.players : [];
  const radiantPlayers = players.filter(
    (p) => typeof p.player_slot === 'number' && p.player_slot < 128
  );
  const direPlayers = players.filter(
    (p) => typeof p.player_slot === 'number' && p.player_slot >= 128
  );
  const picksBans: any[] = Array.isArray(match.picks_bans)
    ? match.picks_bans
    : [];

  // Gather debug image URLs (server-side log)
  const debugImageUrls: string[] = [];

  function heroForId(id?: number | null) {
    const { name, url } = getHeroImageById(heroesJson, id);
    if (url) debugImageUrls.push(url);
    return { name, url };
  }

  function mapItemKeyToData(key: string | null | undefined) {
    const it = getItemFromKey(key, itemMap);
    if (it?.img) debugImageUrls.push(it.img);
    return it;
  }

  // add opponent team logos if present
  (match.opponents ?? []).forEach((opp: any) => {
    const url = sanitizeOpenDotaUrl(
      opp?.opponent?.image_url ?? opp?.opponent?.logo_url ?? null
    );
    if (url) debugImageUrls.push(url);
  });

  // hero images from players + items
  players.forEach((p) => {
    const hero = getHeroImageById(heroesJson, p.hero_id);
    if (hero.url) debugImageUrls.push(hero.url);
    for (let k = 0; k <= 5; k++) {
      const itemKey = p[`item_${k}`];
      if (typeof itemKey === 'string') {
        const it = getItemFromKey(itemKey, itemMap);
        if (it?.img) debugImageUrls.push(it.img);
      }
    }
  });

  // log a sample (deduped) to server console for debugging
  const uniqueUrls = Array.from(new Set(debugImageUrls)).slice(0, 50);
  if (uniqueUrls.length) {
    console.log('DEBUG: sample image URLs for match', id);
    for (const u of uniqueUrls) console.log('  ', u);
  }

  // small UI helper: Render either ImageWithFallback (client) or simple placeholder
  const RenderImage = (props: {
    src?: string | null;
    alt?: string;
    w: number;
    h: number;
    className?: string;
  }) => {
    if (!props.src)
      return (
        <div
          style={{ width: props.w, height: props.h }}
          className="bg-gray-700 rounded-md"
        />
      );
    return (
      <ImageWithFallback
        src={props.src}
        alt={props.alt}
        width={props.w}
        height={props.h}
        className={props.className}
      />
    );
  };

  const statusText = () => {
    if (winnerside) return 'Finished';
    if (
      match.start_time &&
      toMs(match.start_time) &&
      toMs(match.start_time)! <= Date.now()
    )
      return 'Live';
    return 'Scheduled';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {match.name ?? `${radiantName} vs ${direName}`}
          </h1>
          <div className="mt-1 text-sm text-gray-400">
            {league ? <span className="mr-2">{league}</span> : null}
            {tournament ? (
              <span className="mr-2">
                •{' '}
                {typeof tournament === 'string'
                  ? tournament
                  : `Tournament ${tournament}`}
              </span>
            ) : null}
            {startTimeMs ? (
              <span className="text-xs text-gray-400">
                {' '}
                • {formatTime12Hour(startTimeMs)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-white">
              {radiantScore == null && direScore == null
                ? '--'
                : `${radiantScore ?? 0} - ${direScore ?? 0}`}
            </div>
            <div className="text-xs text-gray-400 mt-1">{statusText()}</div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">Duration</div>
            <div className="text-base text-gray-100 font-medium">
              {formatDuration(duration)}
            </div>
          </div>
        </div>
      </div>

      {/* Picks & Bans + Match info */}
      {picksBans.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-3">
            <div className="text-sm text-gray-400 mb-2">Picks & Bans</div>
            <div className="flex gap-2 flex-wrap">
              {picksBans.map((pb: any, i: number) => {
                const isPick = pb.is_pick;
                const team = pb.team === 0 ? 'Radiant' : 'Dire';
                const { name, url } = getHeroImageById(heroesJson, pb.hero_id);
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-2 py-1 rounded ${
                      isPick
                        ? 'bg-gray-900 border border-gray-800'
                        : 'bg-black/30 border border-gray-800'
                    }`}
                  >
                    {url ? (
                      <RenderImage src={url} alt={name} w={36} h={20} />
                    ) : (
                      <div className="w-8 h-5 flex items-center justify-center text-xs text-white bg-gray-800 rounded">
                        {name.slice(0, 2)}
                      </div>
                    )}
                    <div className="text-xs text-gray-200">{name}</div>
                    <div className="text-[11px] text-gray-400">
                      ({team} {isPick ? 'pick' : 'ban'})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-3">
            <div className="text-sm text-gray-400 mb-2">Match Info</div>
            <div className="text-xs text-gray-300 space-y-1">
              <div>
                <strong>Match ID:</strong> {match.match_id ?? id}
              </div>
              {match.match_type && (
                <div>
                  <strong>Type:</strong> {match.match_type}
                </div>
              )}
              {match.number_of_games != null && (
                <div>
                  <strong>Best of:</strong> {match.number_of_games}
                </div>
              )}
              {match.forfeit && (
                <div>
                  <strong>Forfeit:</strong> Yes
                </div>
              )}
              {match.rescheduled && (
                <div>
                  <strong>Rescheduled:</strong> Yes
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Players / teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Radiant */}
        <section
          className={`bg-[#0f0f0f] border ${
            winnerside === 'radiant' ? 'border-yellow-500' : 'border-gray-800'
          } rounded-xl p-4`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-gray-400">Radiant</div>
              <div className="text-lg font-semibold text-white">
                {radiantName}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Score</div>
              <div
                className={`text-xl font-bold ${
                  winnerside === 'radiant' ? 'text-yellow-400' : 'text-white'
                }`}
              >
                {radiantScore ?? '—'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {radiantPlayers.map((p: any, idx: number) => {
              const hero = heroForId(p.hero_id);
              const playerName =
                p.personaname ??
                p.name ??
                (p.account_id
                  ? `Player ${p.account_id}`
                  : `Slot ${p.player_slot}`);
              const itemKeys = [];
              for (let k = 0; k <= 5; k++) itemKeys.push(p[`item_${k}`]);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[#121212] border border-gray-800 rounded p-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden p-1">
                      {hero.url ? (
                        <RenderImage
                          src={hero.url}
                          alt={hero.name}
                          w={48}
                          h={48}
                        />
                      ) : (
                        <div className="text-xs text-white">
                          {hero.name.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium text-gray-100 truncate"
                        title={playerName}
                      >
                        {playerName}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {hero.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-200">
                    <div className="text-xs text-gray-400">K</div>
                    <div className="font-semibold">{p.kills ?? 0}</div>
                    <div className="text-xs text-gray-400">D</div>
                    <div className="font-semibold">{p.deaths ?? 0}</div>
                    <div className="text-xs text-gray-400">A</div>
                    <div className="font-semibold">{p.assists ?? 0}</div>
                  </div>

                  <div className="ml-4 flex items-center gap-2 min-w-0">
                    <div className="flex gap-1">
                      {itemKeys.map(
                        (ik: string | null | undefined, i2: number) => {
                          const it = mapItemKeyToData(ik);
                          if (!it)
                            return (
                              <div
                                key={i2}
                                className="w-6 h-6 bg-gray-900 rounded"
                              />
                            );
                          return it.img ? (
                            <RenderImage
                              key={i2}
                              src={it.img}
                              alt={it.dname ?? ''}
                              w={24}
                              h={24}
                            />
                          ) : (
                            <div
                              key={i2}
                              className="text-[10px] px-1 py-0.5 bg-gray-900 rounded text-white"
                            >
                              {(it.dname ?? '').slice(0, 3)}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dire */}
        <section
          className={`bg-[#0f0f0f] border ${
            winnerside === 'dire' ? 'border-yellow-500' : 'border-gray-800'
          } rounded-xl p-4`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-gray-400">Dire</div>
              <div className="text-lg font-semibold text-white">{direName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Score</div>
              <div
                className={`text-xl font-bold ${
                  winnerside === 'dire' ? 'text-yellow-400' : 'text-white'
                }`}
              >
                {direScore ?? '—'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {direPlayers.map((p: any, idx: number) => {
              const hero = heroForId(p.hero_id);
              const playerName =
                p.personaname ??
                p.name ??
                (p.account_id
                  ? `Player ${p.account_id}`
                  : `Slot ${p.player_slot}`);
              const itemKeys = [];
              for (let k = 0; k <= 5; k++) itemKeys.push(p[`item_${k}`]);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[#121212] border border-gray-800 rounded p-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden p-1">
                      {hero.url ? (
                        <RenderImage
                          src={hero.url}
                          alt={hero.name}
                          w={48}
                          h={48}
                        />
                      ) : (
                        <div className="text-xs text-white">
                          {hero.name.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium text-gray-100 truncate"
                        title={playerName}
                      >
                        {playerName}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {hero.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-200">
                    <div className="text-xs text-gray-400">K</div>
                    <div className="font-semibold">{p.kills ?? 0}</div>
                    <div className="text-xs text-gray-400">D</div>
                    <div className="font-semibold">{p.deaths ?? 0}</div>
                    <div className="text-xs text-gray-400">A</div>
                    <div className="font-semibold">{p.assists ?? 0}</div>
                  </div>

                  <div className="ml-4 flex items-center gap-2 min-w-0">
                    <div className="flex gap-1">
                      {itemKeys.map(
                        (ik: string | null | undefined, i2: number) => {
                          const it = mapItemKeyToData(ik);
                          if (!it)
                            return (
                              <div
                                key={i2}
                                className="w-6 h-6 bg-gray-900 rounded"
                              />
                            );
                          return it.img ? (
                            <RenderImage
                              key={i2}
                              src={it.img}
                              alt={it.dname ?? ''}
                              w={24}
                              h={24}
                            />
                          ) : (
                            <div
                              key={i2}
                              className="text-[10px] px-1 py-0.5 bg-gray-900 rounded text-white"
                            >
                              {(it.dname ?? '').slice(0, 3)}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Raw JSON (collapsed) */}
      <details className="mt-6 bg-[#0b0b0b] border border-gray-800 rounded p-3 text-xs text-gray-300">
        <summary className="cursor-pointer text-sm text-gray-200">
          Raw OpenDota payload
        </summary>
        <pre className="mt-2 text-[10px] max-h-72 overflow-auto">
          {JSON.stringify(match, null, 2)}
        </pre>
      </details>

      <div className="mt-6">
        <Link href="/">
          <span className="text-xs text-gray-400 hover:text-white">
            ← Back to matches
          </span>
        </Link>
      </div>
    </div>
  );
}
