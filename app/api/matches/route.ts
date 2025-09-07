// app/api/matches/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token =
    process.env.PANDASCORE_API_KEY ||
    process.env.NEXT_PUBLIC_PANDASCORE_API_KEY;
  if (!token) {
    return NextResponse.json(
      { error: 'PandaScore API key not configured on server.' },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') ?? '1';
    const per_page = url.searchParams.get('per_page') ?? '20';
    const status = url.searchParams.get('status'); // running | finished | not_started (optional)
    const sort = url.searchParams.get('sort') ?? '-begin_at';

    const params = new URLSearchParams();
    params.set('page', page);
    params.set('per_page', per_page);
    params.set('sort', sort);

    // Force Dota 2 here (server-side). Use the PandaScore videogame slug for Dota 2.
    // If your PandaScore account uses another slug for Dota2 (e.g. "dota-2") change to that.
    params.set('filter[videogame]', 'dota2');

    if (status && status !== 'all') {
      params.set('filter[status]', status);
    }

    const fetchUrl = `https://api.pandascore.co/matches?${params.toString()}`;
    const res = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const bodyText = await res.text();
    if (!res.ok) {
      // forward PandaScore details for debugging
      return NextResponse.json(
        { error: `PandaScore responded ${res.status}`, details: bodyText },
        { status: 502 }
      );
    }

    // body is likely JSON array
    const data = JSON.parse(bodyText);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=20, stale-while-revalidate=60',
      },
    });
  } catch (err: any) {
    console.error('Matches proxy error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
