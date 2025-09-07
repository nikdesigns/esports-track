'use client';

import React, { useState } from 'react';

export default function LoadMoreButton({
  currentCount,
}: {
  currentCount: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleLoadMore = () => {
    setLoading(true);
    const next = currentCount + 10;
    const url = new URL(window.location.href);
    url.searchParams.set('count', String(next));
    window.location.href = url.toString(); // reload with new server params
  };

  return (
    <button
      onClick={handleLoadMore}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
    >
      {loading ? 'Loading…' : 'Load more matches'}
    </button>
  );
}
