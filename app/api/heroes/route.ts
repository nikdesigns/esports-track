// app/api/heroes/route.ts
import { NextResponse } from 'next/server';

/**
 * /api/heroes
 * - Fetches OpenDota /api/heroes once and caches in memory (TTL).
 * - Returns normalized: { id, name, localized_name, img, icon, img_full } where img_full is absolute url to api.opendota
 */

const OPENDOTA_HEROES = 'https://api.opendota.com/api/heroes';
let HERO_CACHE: { ts: number; data: any[] } | null = null;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function safeFetch(url: string, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function GET() {
  try {
    if (HERO_CACHE && Date.now() - HERO_CACHE.ts < CACHE_TTL) {
      return NextResponse.json(HERO_CACHE.data);
    }

    const res = await safeFetch(OPENDOTA_HEROES, 10000);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[api/heroes] OpenDota non-OK', res.status, txt);
      return NextResponse.json(
        { error: 'OpenDota upstream error', details: txt },
        { status: 502 }
      );
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn('[api/heroes] unexpected OpenDota heroes response', data);
      return NextResponse.json([], { status: 200 });
    }

    // normalize and compute absolute img/icon urls
    const normalized = data.map((h: any) => {
      // OpenDota hero object has fields: id, name, localized_name, img, icon
      const img = h.img ?? null; // often like "/apps/dota2/images/dota_react/heroes/medusa.png"
      const icon = h.icon ?? null;
      const base = 'https://api.opendota.com';
      return {
        id: h.id,
        name: h.name,
        localized_name: h.localized_name,
        img,
        icon,
        img_full: img ? `${base}${img}` : null,
        icon_full: icon ? `${base}${icon}` : null,
      };
    });

    HERO_CACHE = { ts: Date.now(), data: normalized };
    return NextResponse.json(normalized);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[api/heroes] OpenDota timed out');
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    console.error('[api/heroes] unexpected error', err);
    return NextResponse.json(
      { error: 'Server error fetching heroes' },
      { status: 500 }
    );
  }
}
