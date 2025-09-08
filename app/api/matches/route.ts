// app/api/matches/route.ts
import { NextResponse } from 'next/server';

const PANDASCORE_API_KEY =
  process.env.PANDASCORE_API_KEY ||
  process.env.NEXT_PUBLIC_PANDASCORE_API_KEY ||
  '';
const STRATZ_API_URL = process.env.STRATZ_API_URL || '';
const STRATZ_API_KEY = process.env.STRATZ_API_KEY || '';
const OPENDOTA_PROMATCHES = 'https://api.opendota.com/api/proMatches';

const DEFAULT_PER_PAGE = 12;
const RUNNING_WINDOW_HOURS = 6;
const CACHE_TTL_MS = 1000 * 20;
const LIST_CACHE = new Map<string, { ts: number; data: any }>();

function parseQueryParams(url: URL) {
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  return params;
}

async function timedFetch(
  url: string,
  opts: RequestInit = {},
  timeout = 10000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function safeIsoFromUnix(sec: number | null | undefined) {
  if (!sec) return null;
  try {
    return new Date(sec * 1000).toISOString();
  } catch {
    return null;
  }
}

function inferStatusFromFields(fields: {
  scheduledAt?: string | null;
  start_time_unix?: number | null;
  duration?: number | null;
  startAt?: string | null;
}) {
  const now = Date.now();
  if (fields.scheduledAt) {
    const ms = Date.parse(fields.scheduledAt);
    if (!isNaN(ms)) {
      if (ms > now + 5000) return 'not_started';
    }
  }
  if (fields.start_time_unix) {
    const ms = fields.start_time_unix * 1000;
    if (ms > now + 5000) return 'not_started';
    if (fields.duration && fields.duration > 0) return 'finished';
    if (now - ms <= RUNNING_WINDOW_HOURS * 3600 * 1000) return 'running';
    return 'finished';
  }
  if (fields.startAt) {
    const ms = Date.parse(fields.startAt);
    if (!isNaN(ms)) {
      if (ms > now + 5000) return 'not_started';
      if (now - ms <= RUNNING_WINDOW_HOURS * 3600 * 1000) return 'running';
      return 'finished';
    }
  }
  if (fields.duration && fields.duration > 0) return 'finished';
  return 'finished';
}

function normalizePandaMatch(m: any) {
  // PandaScore match object mapping (defensive)
  const opponents = (m.opponents ?? []).map((o: any) => ({
    opponent: {
      id: o.opponent?.id ?? null,
      name: o.opponent?.name ?? null,
      acronym: o.opponent?.acronym ?? null,
      image_url: o.opponent?.image_url ?? null,
    },
  }));
  const scheduled_at = m.scheduled_at ?? m.begin_at ?? null;
  const begin_at = m.begin_at ?? null;
  const status =
    m.status ??
    inferStatusFromFields({ scheduledAt: scheduled_at, startAt: begin_at });
  const score =
    m.results && Array.isArray(m.results)
      ? m.results.map((r: any) => r.score ?? null)
      : m.score
      ? m.score
      : [null, null];
  return {
    id: m.id ?? m.match_id ?? null,
    name:
      m.name ??
      (opponents[0]?.opponent?.name && opponents[1]?.opponent?.name
        ? `${opponents[0].opponent.name} vs ${opponents[1].opponent.name}`
        : null),
    scheduled_at,
    begin_at,
    status,
    opponents,
    score,
    videogame: { slug: m.videogame?.slug ?? m.videogame_slug ?? 'dota2' },
    league: {
      name: m.league?.name ?? null,
      image_url: m.league?.image_url ?? null,
    },
    raw: m,
  };
}

function normalizeStratzMatch(node: any) {
  const id = node?.id ?? node?.matchId ?? null;
  const leagueName = node?.league?.name ?? node?.tournament?.name ?? null;
  const getTeam = (t: any) =>
    t
      ? {
          id: t?.id ?? t?.teamId ?? null,
          name: t?.name ?? t?.acronym ?? t?.displayName ?? null,
          acronym: t?.acronym ?? null,
          image_url: t?.logoUrl ?? t?.imageUrl ?? null,
        }
      : { id: null, name: null, acronym: null, image_url: null };
  let opponents: any[] = [];
  if (node?.teams && Array.isArray(node.teams))
    opponents = node.teams
      .slice(0, 2)
      .map((t: any) => ({ opponent: getTeam(t) }));
  else if (node?.teamA || node?.teamB)
    opponents = [
      { opponent: getTeam(node.teamA) },
      { opponent: getTeam(node.teamB) },
    ];
  const scheduled_at = node?.scheduledAt ?? node?.startAt ?? null;
  const begin_at = node?.beginAt ?? node?.startedAt ?? node?.startAt ?? null;
  const duration = node?.duration ?? node?.matchDuration ?? null;
  const startUnix = node?.start_time_unix ?? null;
  const status = inferStatusFromFields({
    scheduledAt: scheduled_at,
    start_time_unix: startUnix,
    duration,
    startAt: begin_at,
  });
  const score = [
    node?.scoreA ?? node?.radiantScore ?? node?.score?.[0] ?? null,
    node?.scoreB ?? node?.direScore ?? node?.score?.[1] ?? null,
  ];
  const picks = node?.draft ?? node?.picks ?? node?.picksBans ?? null;
  const maps = node?.maps ?? node?.games ?? node?.mapResults ?? null;
  return {
    id,
    name:
      node?.name ??
      `${opponents?.[0]?.opponent?.name ?? 'Team A'} vs ${
        opponents?.[1]?.opponent?.name ?? 'Team B'
      }`,
    scheduled_at,
    begin_at,
    status,
    opponents,
    score,
    picks,
    maps,
    videogame: { slug: 'dota2' },
    league: { name: leagueName, image_url: node?.league?.imageUrl ?? null },
    raw: node,
  };
}

function normalizeOpenDotaProMatch(m: any) {
  const radiantName =
    m.radiant_name ?? m.radiant_team_tag ?? m.radiant_team_name ?? null;
  const direName = m.dire_name ?? m.dire_team_tag ?? m.dire_team_name ?? null;
  const opponents = [
    {
      opponent: {
        id: m.radiant_team_id ?? null,
        name: radiantName || 'Radiant',
        acronym: m.radiant_team_tag ?? null,
        image_url: m.radiant_logo ?? null,
      },
    },
    {
      opponent: {
        id: m.dire_team_id ?? null,
        name: direName || 'Dire',
        acronym: m.dire_team_tag ?? null,
        image_url: m.dire_logo ?? null,
      },
    },
  ];
  const start = typeof m.start_time === 'number' ? m.start_time : null;
  const duration = typeof m.duration === 'number' ? m.duration : null;
  const status = inferStatusFromFields({
    scheduledAt: start ? new Date(start * 1000).toISOString() : null,
    start_time_unix: start,
    duration,
  });
  const scheduled_at = start ? new Date(start * 1000).toISOString() : null;
  const begin_at = scheduled_at;
  const score = [m.radiant_score ?? null, m.dire_score ?? null];
  return {
    id: m.match_id ?? m.match_seq_num ?? null,
    name: `${opponents[0].opponent.name} vs ${opponents[1].opponent.name}`,
    scheduled_at,
    begin_at,
    status,
    opponents,
    score,
    picks: null,
    maps: null,
    videogame: { slug: 'dota2' },
    league: { name: m.league_name ?? null, image_url: m.league_image ?? null },
    raw: m,
  };
}

function dedupeMatches(arr: any[]) {
  const seen = new Set();
  const out: any[] = [];
  for (const m of arr) {
    const key = m?.id ?? JSON.stringify(m);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

function sortMatches(arr: any[]) {
  return arr.sort((a: any, b: any) => {
    const order = (s: string) =>
      s === 'not_started' ? 0 : s === 'running' ? 1 : 2;
    const oa = order(a.status ?? 'finished');
    const ob = order(b.status ?? 'finished');
    if (oa !== ob) return oa - ob;
    if (oa === 0) {
      const ta = a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity;
      const tb = b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity;
      return ta - tb;
    }
    const ba = a.begin_at ? Date.parse(a.begin_at) : 0;
    const bb = b.begin_at ? Date.parse(b.begin_at) : 0;
    return bb - ba;
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = parseQueryParams(url);
  const per_page = Number(q['per_page'] ?? q['limit'] ?? DEFAULT_PER_PAGE);
  const page = Math.max(1, Number(q['page'] ?? '1'));
  const statusFilter = q['filter[status]'] ?? undefined;
  const cacheKey = `matches:${per_page}:${page}:${statusFilter ?? 'all'}`;
  const cached = LIST_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // 1) If PandaScore API key present, use PandaScore for scheduled/live (recommended for scheduled)
  if (PANDASCORE_API_KEY) {
    try {
      const pandaUrl = new URL('https://api.pandascore.co/matches');
      pandaUrl.searchParams.set('per_page', String(per_page));
      pandaUrl.searchParams.set('page', String(page));
      if (statusFilter)
        pandaUrl.searchParams.set('filter[status]', statusFilter);
      // include videogame filter for dota2 optionally
      pandaUrl.searchParams.set('filter[videogame]', 'dota2');

      const res = await timedFetch(
        pandaUrl.toString(),
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${PANDASCORE_API_KEY}`,
            Accept: 'application/json',
          },
        },
        12000
      );

      const txt = await res.text().catch(() => '');
      if (!res.ok) {
        console.warn('[api/matches] PandaScore non-OK', res.status, txt);
        // fallback to other providers if pandascore fails
        throw new Error('PandaScore non-ok');
      }
      const data = JSON.parse(txt);
      const normalized = Array.isArray(data)
        ? data.map(normalizePandaMatch)
        : [];
      LIST_CACHE.set(cacheKey, { ts: Date.now(), data: normalized });
      return NextResponse.json(normalized);
    } catch (err) {
      console.warn(
        '[api/matches] PandaScore attempt failed, falling back',
        (err as any)?.message ?? err
      );
    }
  }

  // 2) Try Stratz GraphQL (if configured)
  let stratzMatches: any[] = [];
  if (STRATZ_API_URL) {
    try {
      const graphQuery = `
        query RecentMatches($limit: Int!, $offset: Int!) {
          matches(limit: $limit, offset: $offset, videogameSlug: "dota2") {
            id
            name
            startAt
            scheduledAt
            status
            league { id name imageUrl }
            teams { id name acronym logoUrl }
            scoreA
            scoreB
            draft { picks bans }
            maps { mapName results { teamAScore teamBScore } }
            duration
          }
        }
      `;
      const offset = (page - 1) * per_page;
      const body = {
        query: graphQuery,
        variables: { limit: per_page, offset },
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (STRATZ_API_KEY) headers['Authorization'] = `Bearer ${STRATZ_API_KEY}`;

      const res = await timedFetch(
        STRATZ_API_URL,
        { method: 'POST', headers, body: JSON.stringify(body) },
        12000
      );
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        console.warn('[api/matches] Stratz non-OK', res.status, text);
        throw new Error('Stratz non-ok');
      }
      const json = JSON.parse(text);
      const nodes = json?.data?.matches ?? json?.matches ?? [];
      if (Array.isArray(nodes)) stratzMatches = nodes.map(normalizeStratzMatch);
    } catch (err) {
      console.warn(
        '[api/matches] Stratz attempt failed',
        (err as any)?.message ?? err
      );
    }
  }

  // 3) If client asked upcoming explicitly, try OpenDota but with a large window and filter future scheduled times
  if (statusFilter === 'not_started') {
    try {
      const fetchLimit = Math.max(80, per_page * page * 4);
      const odUrl = new URL(OPENDOTA_PROMATCHES);
      odUrl.searchParams.set('limit', String(fetchLimit));
      const res = await timedFetch(odUrl.toString(), { method: 'GET' }, 20000);
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        console.warn(
          '[api/matches] OpenDota non-OK when fetching upcoming',
          res.status,
          text
        );
        // return Stratz upcoming if any
        const filteredFromStratz = stratzMatches.filter(
          (m) => m.status === 'not_started'
        );
        LIST_CACHE.set(cacheKey, { ts: Date.now(), data: filteredFromStratz });
        return NextResponse.json(filteredFromStratz);
      }
      const body = JSON.parse(text);
      if (!Array.isArray(body)) {
        const filteredFromStratz = stratzMatches.filter(
          (m) => m.status === 'not_started'
        );
        LIST_CACHE.set(cacheKey, { ts: Date.now(), data: filteredFromStratz });
        return NextResponse.json(filteredFromStratz);
      }
      const normalized = body.map(normalizeOpenDotaProMatch);
      const upcoming = normalized.filter((m) => {
        if (!m.scheduled_at) return false;
        const t = Date.parse(m.scheduled_at);
        return !isNaN(t) && t > Date.now() + 5000;
      });
      const start = (page - 1) * per_page;
      const paged = upcoming.slice(start, start + per_page);
      LIST_CACHE.set(cacheKey, { ts: Date.now(), data: paged });
      return NextResponse.json(paged);
    } catch (err) {
      console.warn(
        '[api/matches] OpenDota upcoming fetch failed',
        (err as any)?.message ?? err
      );
      const filteredFromStratz = stratzMatches.filter(
        (m) => m.status === 'not_started'
      );
      LIST_CACHE.set(cacheKey, { ts: Date.now(), data: filteredFromStratz });
      return NextResponse.json(filteredFromStratz);
    }
  }

  // 4) Combine Stratz + some OpenDota upcoming to enrich 'all'
  try {
    const combined: any[] = [];
    if (stratzMatches.length > 0) combined.push(...stratzMatches);

    // Add a small amount of upcoming from OpenDota to include scheduled matches
    try {
      const fetchLimit = Math.max(40, per_page * page * 2);
      const odUrl = new URL(OPENDOTA_PROMATCHES);
      odUrl.searchParams.set('limit', String(fetchLimit));
      const res = await timedFetch(odUrl.toString(), { method: 'GET' }, 15000);
      const text = await res.text().catch(() => '');
      if (res.ok) {
        const body = JSON.parse(text);
        if (Array.isArray(body)) {
          const upcoming = body
            .map(normalizeOpenDotaProMatch)
            .filter((m) => {
              if (!m.scheduled_at) return false;
              const t = Date.parse(m.scheduled_at);
              return !isNaN(t) && t > Date.now() + 5000;
            })
            .slice(0, per_page);
          combined.push(...upcoming);
        }
      } else {
        console.warn(
          '[api/matches] OpenDota enrichment non-OK',
          res.status,
          text
        );
      }
    } catch (err) {
      console.warn(
        '[api/matches] OpenDota enrichment failed',
        (err as any)?.message ?? err
      );
    }

    if (combined.length === 0) {
      // fallback: fetch OpenDota full proMatches list and return page
      const fetchLimit = Math.max(1, per_page * page);
      const odUrl = new URL(OPENDOTA_PROMATCHES);
      odUrl.searchParams.set('limit', String(fetchLimit));
      const res = await timedFetch(odUrl.toString(), { method: 'GET' }, 12000);
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        console.error(
          '[api/matches] OpenDota fallback non-OK',
          res.status,
          text
        );
        LIST_CACHE.set(cacheKey, { ts: Date.now(), data: [] });
        return NextResponse.json([]);
      }
      const body = JSON.parse(text);
      if (Array.isArray(body)) {
        const normalized = body.map(normalizeOpenDotaProMatch);
        const start = (page - 1) * per_page;
        const paged = normalized.slice(start, start + per_page);
        LIST_CACHE.set(cacheKey, { ts: Date.now(), data: paged });
        return NextResponse.json(paged);
      }
    }

    let final = dedupeMatches(combined);
    if (statusFilter) {
      final = final.filter((m) => String(m.status) === String(statusFilter));
    }
    final = sortMatches(final);
    const start = (page - 1) * per_page;
    const paged = final.slice(start, start + per_page);
    LIST_CACHE.set(cacheKey, { ts: Date.now(), data: paged });
    return NextResponse.json(paged);
  } catch (err) {
    console.error(
      '[api/matches] combining sources failed',
      (err as any)?.message ?? err
    );
    return NextResponse.json(
      { error: 'Server error combining match sources' },
      { status: 500 }
    );
  }
}
