// app/api/hero-stats/route.ts
import { NextResponse } from 'next/server';

const OPENDOTA_HEROSTATS = 'https://api.opendota.com/api/heroStats';
const HERO_META_ROUTE = '/api/heroes'; // internal route we created earlier
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

let CACHE: { ts: number; data: any[] } | null = null;

async function safeFetch(url: string, opts: RequestInit = {}, timeout = 10000) {
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

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  // return cached if available
  if (CACHE && Date.now() - CACHE.ts < CACHE_TTL_MS) {
    return NextResponse.json(CACHE.data);
  }

  try {
    // Fetch hero stats from OpenDota
    const statsRes = await safeFetch(OPENDOTA_HEROSTATS, {}, 12000);
    if (!statsRes.ok) {
      const txt = await statsRes.text().catch(() => '');
      console.error('[api/hero-stats] OpenDota non-OK', statsRes.status, txt);
      return NextResponse.json(
        { error: 'OpenDota upstream error', details: txt },
        { status: 502 }
      );
    }
    const statsJson = await statsRes.json();

    // Fetch hero metadata (cached in /api/heroes)
    const metaRes = await safeFetch(
      new URL(HERO_META_ROUTE, `http://localhost`).toString()
    ).catch(() => null);
    // NOTE: above uses localhost; the Next server can call relative internal routes only via absolute URL in dev.
    // If that fails (e.g., in some environments), we'll also fall back to OpenDota heroes endpoint directly.

    let heroMeta: any[] = [];
    if (metaRes && metaRes.ok) {
      try {
        heroMeta = await metaRes.json();
      } catch {
        heroMeta = [];
      }
    }

    if (!Array.isArray(heroMeta) || heroMeta.length === 0) {
      // fallback: get hero metadata directly from OpenDota if our /api/heroes didn't respond
      const fallbackMetaRes = await safeFetch(
        'https://api.opendota.com/api/heroes',
        {},
        10000
      );
      if (fallbackMetaRes.ok) heroMeta = await fallbackMetaRes.json();
    }

    // Build a map for quick lookup: try by id, name, localized_name
    const metaById = new Map<any, any>();
    const metaByName = new Map<string, any>();
    for (const m of heroMeta || []) {
      if (m == null) continue;
      if (typeof m.id !== 'undefined') metaById.set(Number(m.id), m);
      if (m.name) metaByName.set(String(m.name).toLowerCase(), m);
      if (m.localized_name)
        metaByName.set(String(m.localized_name).toLowerCase(), m);
    }

    // Normalize stats list
    const normalized = (Array.isArray(statsJson) ? statsJson : [])
      .map((s: any) => {
        // openDota heroStats fields can include:
        // id, name, localized_name, wins, pick, pro_win, pro_pick, etc.
        const id = typeof s.id !== 'undefined' ? Number(s.id) : null;
        const name = s.name ?? s.localized_name ?? null;
        const localized_name = s.localized_name ?? null;

        const total_pick = safeNum(
          s.pick ?? s.total_pick ?? s.num_pick ?? s.games ?? 0
        );
        const total_win = safeNum(s.win ?? s.total_win ?? s.wins ?? 0);

        // compute percentages safely
        const pick_rate =
          total_pick > 0
            ? total_pick / Math.max(1, /*total matches approx*/ 1)
            : 0;
        // NOTE: OpenDota heroStats typically include pick/win counts across all matches; but pick_rate needs a denominator.
        // We'll compute a hero-level win_rate = wins / picks * 100 (if picks > 0)
        const win_rate = total_pick > 0 ? (total_win / total_pick) * 100 : 0;

        // also attempt to extract pro fields if present
        const pro_pick = safeNum(
          s.pro_pick ?? s.pro_pick_count ?? s.proPick ?? 0
        );
        const pro_win = safeNum(s.pro_win ?? s.pro_win_count ?? s.proWin ?? 0);

        // Attach image meta (img_full/icon_full) from heroMeta if available
        const meta =
          typeof id === 'number' && metaById.has(id)
            ? metaById.get(id)
            : metaByName.get(String(name ?? '').toLowerCase());
        const img_full = meta?.img_full ?? meta?.img ?? null;
        const icon_full = meta?.icon_full ?? meta?.icon ?? null;

        return {
          id,
          name,
          localized_name,
          img_full,
          icon_full,
          pick: total_pick,
          win: total_win,
          pick_rate_raw: total_pick, // raw pick count
          win_rate: Number(win_rate.toFixed(2)), // percentage 0-100
          pro_pick,
          pro_win,
        };
      })
      // sort by pick count desc by default (who's most popular)
      .sort((a: any, b: any) => (b.pick ?? 0) - (a.pick ?? 0));

    // cache and return top ~ (you asked for trends — we will return whole list, frontend can choose top N)
    CACHE = { ts: Date.now(), data: normalized };
    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error('[api/hero-stats] error', err);
    return NextResponse.json(
      { error: 'Server error fetching hero stats' },
      { status: 500 }
    );
  }
}
