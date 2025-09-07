// app/api/matches/[id]/route.ts
import { NextResponse } from 'next/server';

const PANDASCORE_BASE = 'https://api.pandascore.co';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const key = process.env.PANDASCORE_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: 'Server missing Pandascore API key (PANDASCORE_API_KEY).' },
      { status: 500 }
    );
  }

  try {
    // Build target URL and forward query params from the incoming request
    const targetUrl = new URL(
      `${PANDASCORE_BASE}/matches/${encodeURIComponent(id)}`
    );

    // forward query params (e.g. include=opponents,games,streams_list,...)
    const incomingUrl = new URL(request.url);
    for (const [k, v] of incomingUrl.searchParams.entries()) {
      targetUrl.searchParams.set(k, v);
    }

    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    });

    const text = await res.text();

    // Try to parse JSON; if parse fails keep raw text
    let payload: any = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!res.ok) {
      // Forward the status and a helpful JSON payload
      const message =
        payload?.message ??
        payload?.error ??
        (typeof payload === 'string'
          ? payload
          : `Pandascore returned ${res.status}`);
      return NextResponse.json(
        { error: message, detail: payload },
        { status: res.status }
      );
    }

    // Success: return parsed JSON (or raw text if not JSON)
    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error('Pandascore proxy error for match', id, err);
    const message = err?.message ?? 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
