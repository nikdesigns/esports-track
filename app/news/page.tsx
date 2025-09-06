'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Game = 'all' | 'dota2' | 'csgo' | 'valorant' | 'lol' | 'overwatch';

interface NewsItem {
  id: number;
  title: string;
  game: Game;
  date: string;
}

const mockNews: NewsItem[] = [
  {
    id: 1,
    title: 'Dota 2 Championship Recap',
    game: 'dota2',
    date: '2025-09-06',
  },
  { id: 2, title: 'CS:GO Major Highlights', game: 'csgo', date: '2025-09-05' },
  {
    id: 3,
    title: 'Valorant Patch Notes',
    game: 'valorant',
    date: '2025-09-04',
  },
  { id: 4, title: 'LoL Worlds Preview', game: 'lol', date: '2025-09-03' },
  {
    id: 5,
    title: 'Overwatch League Update',
    game: 'overwatch',
    date: '2025-09-02',
  },
];

export default function NewsPage() {
  const [selectedGame, setSelectedGame] = useState<Game>('all');

  const filteredNews =
    selectedGame === 'all'
      ? mockNews
      : mockNews.filter((news) => news.game === selectedGame);

  return (
    <div className="min-h-screen bg-[#121212] text-gray-300 p-6">
      {/* Tabs */}
      <Tabs
        defaultValue="all"
        onValueChange={(value: string) => setSelectedGame(value as Game)}
      >
        <TabsList className="grid grid-cols-6 max-w-xl bg-[#1a1a1a] border border-gray-700 rounded-xl mb-6">
          {['all', 'dota2', 'csgo', 'valorant', 'lol', 'overwatch'].map(
            (game) => (
              <TabsTrigger
                key={game}
                value={game as Game}
                className="text-gray-400 hover:text-white data-[state=active]:bg-gray-800 data-[state=active]:text-white rounded-lg"
              >
                {game === 'all'
                  ? 'All'
                  : game.charAt(0).toUpperCase() + game.slice(1)}
              </TabsTrigger>
            )
          )}
        </TabsList>
      </Tabs>

      {/* News List */}
      <div className="space-y-4">
        {filteredNews.map((news) => (
          <div
            key={news.id}
            className="p-4 border border-gray-700 rounded-xl bg-[#1a1a1a] hover:bg-gray-900 transition"
          >
            <h2 className="text-lg font-semibold text-white">{news.title}</h2>
            <p className="text-sm text-gray-400">
              {news.game.toUpperCase()} &bull; {news.date}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
