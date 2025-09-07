// app/matches/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';

type AnyObj = Record<string, any>;

/* --------------------
   Endpoints & config
   -------------------- */
const MATCH_URL = (id: string | number) =>
  `https://api.opendota.com/api/matches/${id}`;
const HEROES_LIST_URL = 'https://api.opendota.com/api/heroes';
const ITEMS_URL = 'https://api.opendota.com/api/constants/items';

/* hero image base and candidate suffixes */
const HERO_IMG_BASE =
  'https://api.opendota.com/apps/dota2/images/dota_react/heroes';
const CANDIDATE_SUFFIXES = [
  '_lg.png',
  '.png',
  '_portrait.png',
  '_vert.png',
  '_full.png',
];

/* --------------------
   Utilities
   -------------------- */
const toMs = (unixSeconds?: number | null) =>
  typeof unixSeconds === 'number' ? unixSeconds * 1000 : null;

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

function sanitizeUrl(raw?: string | null) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  while (s.endsWith('?') || s.endsWith('&')) s = s.slice(0, -1);
  if (s.startsWith('/')) s = `https://api.opendota.com${s}`;
  if (s.startsWith('http://')) s = 'https://' + s.slice(7);
  return s || null;
}

/* --------------------
   Fetch with retries + timeout
   -------------------- */
async function fetchWithRetries(
  url: string,
  retries = 3,
  timeoutMs = 12000,
  backoffMs = 500
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log(`[fetchWithRetries] attempt ${attempt}/${retries} ${url}`);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        let body = '';
        try {
          body = await res.text();
          if (body.length > 300) body = body.slice(0, 300) + '...';
        } catch {}
        console.warn(
          `[fetchWithRetries] ${url} returned ${res.status} ${res.statusText}`,
          body ? `body: ${body}` : ''
        );
        if (res.status >= 500 || res.status === 429) {
          // allow retry
        } else {
          return null;
        }
      } else {
        return await res.json();
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        console.warn(`[fetchWithRetries] timeout ${timeoutMs}ms for ${url}`);
      } else {
        console.warn(
          `[fetchWithRetries] fetch error for ${url}:`,
          err?.message ?? err
        );
      }
    }
    if (attempt < retries) {
      const waitMs = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  console.error(`[fetchWithRetries] all ${retries} attempts failed for ${url}`);
  return null;
}

/* --------------------
   HEAD-check helper & server cache for hero urls
   -------------------- */
const heroUrlCache = new Map<number, string | null>(); // heroId -> url or null

async function urlExistsHEAD(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function baseHeroNameFrom(heroName: string | undefined | null) {
  if (!heroName || typeof heroName !== 'string') return null;
  const maybe = heroName.replace(/^npc_dota_hero_/, '');
  return maybe
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/* Resolve hero url server-side by trying explicit fields then candidate filenames */
async function resolveHeroUrlServer(hid: number, heroApiEntry?: AnyObj | null) {
  // check cache
  if (heroUrlCache.has(hid)) return heroUrlCache.get(hid) ?? null;

  const tried: string[] = [];

  // try explicit img/icon fields first (some APIs may include these)
  const explicitImg = sanitizeUrl(heroApiEntry?.img ?? null);
  const explicitIcon = sanitizeUrl(heroApiEntry?.icon ?? null);

  if (explicitImg) {
    tried.push(explicitImg);
    if (await urlExistsHEAD(explicitImg)) {
      heroUrlCache.set(hid, explicitImg);
      return explicitImg;
    }
  }
  if (explicitIcon) {
    tried.push(explicitIcon);
    if (await urlExistsHEAD(explicitIcon)) {
      heroUrlCache.set(hid, explicitIcon);
      return explicitIcon;
    }
  }

  // build base from name (e.g. npc_dota_hero_nevermore -> nevermore)
  const base = baseHeroNameFrom(
    heroApiEntry?.name ?? heroApiEntry?.localized_name ?? ''
  );
  if (!base) {
    heroUrlCache.set(hid, null);
    return null;
  }

  // try candidate suffixes in order
  for (const suf of CANDIDATE_SUFFIXES) {
    const cand = `${HERO_IMG_BASE}/${base}${suf}`;
    tried.push(cand);
    if (await urlExistsHEAD(cand)) {
      heroUrlCache.set(hid, cand);
      return cand;
    }
  }

  // try plain .png as last resort
  const plain = `${HERO_IMG_BASE}/${base}.png`;
  tried.push(plain);
  if (await urlExistsHEAD(plain)) {
    heroUrlCache.set(hid, plain);
    return plain;
  }

  heroUrlCache.set(hid, null);
  return null;
}

/* --------------------
   Page component (Server)
   -------------------- */
export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // fetch match, heroes list, and items (concurrently)
  const [matchJson, heroesListJson, itemsJson] = await Promise.all([
    fetchWithRetries(MATCH_URL(id), 3, 15000, 500),
    fetchWithRetries(HEROES_LIST_URL, 2, 10000, 400),
    fetchWithRetries(ITEMS_URL, 2, 10000, 400),
  ]);

  // debug: log heroes list sample to help debugging
  if (Array.isArray(heroesListJson)) {
    console.log(
      'DEBUG heroesListJson sample (first 6):',
      heroesListJson.slice(0, 6)
    );
  } else {
    console.log('DEBUG heroesListJson: not available or not array');
  }

  if (!matchJson) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Match {id}</h1>
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-300">
          <p>
            Unable to load match details from OpenDota after several attempts.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Check server console for debug logs (heroes list, resolved hero
            URLs, errors).
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

  const match: AnyObj = matchJson as AnyObj;

  // Build a map from heroId -> hero API entry (if available)
  const heroApiMap = new Map<number, AnyObj | null>();
  if (Array.isArray(heroesListJson)) {
    for (const h of heroesListJson) {
      if (!h || typeof h.id !== 'number') continue;
      heroApiMap.set(h.id, h);
    }
  }

  // players & picks_bans
  const players: AnyObj[] = Array.isArray(match.players) ? match.players : [];
  const picksBans: AnyObj[] = Array.isArray(match.picks_bans)
    ? match.picks_bans
    : [];

  // collect unique hero ids used
  const usedHeroIds = new Set<number>();
  players.forEach((p) => {
    if (typeof p.hero_id === 'number') usedHeroIds.add(p.hero_id);
  });
  picksBans.forEach((pb) => {
    if (typeof pb.hero_id === 'number') usedHeroIds.add(pb.hero_id);
  });

  // Resolve hero urls server-side in parallel (caches applied)
  const resolvePromises = Array.from(usedHeroIds).map(async (hid) => {
    const apiEntry = heroApiMap.get(hid) ?? null;
    const url = await resolveHeroUrlServer(hid, apiEntry);
    const name = apiEntry?.localized_name ?? apiEntry?.name ?? `Hero ${hid}`;
    // return object
    return { hid, name, url, tried: undefined }; // tried not returned here (we log inside helper if needed)
  });

  const resolved = await Promise.all(resolvePromises);
  const heroResolved = new Map<number, { name: string; url?: string | null }>();
  for (const r of resolved) {
    heroResolved.set(r.hid, { name: r.name, url: r.url ?? null });
  }

  // Debug: log resolved results (first 20)
  console.log(
    'DEBUG heroResolved after HEAD-check (sample):',
    Array.from(heroResolved.entries()).slice(0, 20)
  );

  // items map for item icons
  const itemMap = new Map<string, { dname?: string; img?: string }>();
  if (itemsJson && typeof itemsJson === 'object') {
    for (const k of Object.keys(itemsJson)) {
      const it = (itemsJson as AnyObj)[k];
      if (!it) continue;
      itemMap.set(k, {
        dname: it.dname ?? it.name ?? k,
        img: sanitizeUrl(it.img ?? null),
      });
    }
  }

  // prepare view fields
  const radiantName =
    match.radiant_name ?? match.radiant_team?.name ?? 'Radiant';
  const direName = match.dire_name ?? match.dire_team?.name ?? 'Dire';
  const radiantScore =
    typeof match.radiant_score === 'number' ? match.radiant_score : null;
  const direScore =
    typeof match.dire_score === 'number' ? match.dire_score : null;
  const startTimeMs = toMs(match.start_time ?? null);
  const tournament =
    match.tournament?.name ?? match.tournament ?? match.tournament_id ?? null;
  const winnerside =
    typeof match.radiant_win === 'boolean'
      ? match.radiant_win
        ? 'radiant'
        : 'dire'
      : null;

  // small helper component that uses your client-side ImageWithFallback
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

  // UI render
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {match.name ?? `${radiantName} vs ${direName}`}
          </h1>
          <div className="mt-1 text-sm text-gray-400">
            {tournament ? <span className="mr-2">• {tournament}</span> : null}
            {startTimeMs ? (
              <span className="text-xs text-gray-400">
                {' '}
                • {formatTime12Hour(startTimeMs)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-extrabold text-white">
            {radiantScore == null && direScore == null
              ? '--'
              : `${radiantScore ?? 0} - ${direScore ?? 0}`}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {winnerside
              ? 'Finished'
              : match.start_time && toMs(match.start_time)! <= Date.now()
              ? 'Live'
              : 'Scheduled'}
          </div>
        </div>
      </div>

      {/* Players (sample / full) */}
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
            {players
              .filter(
                (p) => typeof p.player_slot === 'number' && p.player_slot < 128
              )
              .map((p: AnyObj, idx: number) => {
                const heroEntry = heroResolved.get(p.hero_id);
                const heroName = heroEntry?.name ?? `Hero ${p.hero_id}`;
                const heroUrl = heroEntry?.url ?? null;
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
                    key={p.account_id ?? idx}
                    className="flex items-center justify-between bg-[#121212] border border-gray-800 rounded p-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden p-1">
                        {heroUrl ? (
                          <RenderImage
                            src={heroUrl}
                            alt={heroName}
                            w={48}
                            h={48}
                          />
                        ) : (
                          <div className="text-xs text-white">
                            {heroName.slice(0, 2)}
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
                          {heroName}
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
            {players
              .filter(
                (p) => typeof p.player_slot === 'number' && p.player_slot >= 128
              )
              .map((p: AnyObj, idx: number) => {
                const heroEntry = heroResolved.get(p.hero_id);
                const heroName = heroEntry?.name ?? `Hero ${p.hero_id}`;
                const heroUrl = heroEntry?.url ?? null;
                const playerName =
                  p.personaname ??
                  p.name ??
                  (p.account_id
                    ? `Player ${p.account_id}`
                    : `Slot ${p.player_slot}`);
                return (
                  <div
                    key={p.account_id ?? idx}
                    className="flex items-center justify-between bg-[#121212] border border-gray-800 rounded p-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden p-1">
                        {heroUrl ? (
                          <RenderImage
                            src={heroUrl}
                            alt={heroName}
                            w={48}
                            h={48}
                          />
                        ) : (
                          <div className="text-xs text-white">
                            {heroName.slice(0, 2)}
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
                          {heroName}
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
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {/* Raw payload for debugging */}
      <details className="mt-6 bg-[#0b0b0b] border border-gray-800 rounded p-3 text-xs text-gray-300">
        <summary className="cursor-pointer text-sm text-gray-200">
          Raw OpenDota match payload
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
