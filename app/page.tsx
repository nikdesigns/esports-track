'use client';
export default function Page() {
  return <EsportsDashboard />;
}

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Trophy, Clock } from 'lucide-react';

// Mock Data
const matches = [
  {
    id: 1,
    game: 'dota2',
    teams: ['Team Spirit', 'PSG.LGD'],
    score: [18, 12],
    status: 'live',
    startTime: '29:45',
  },
  {
    id: 2,
    game: 'csgo',
    teams: ['Navi', 'G2'],
    score: [12, 16],
    status: 'finished',
    startTime: '--',
  },
  {
    id: 3,
    game: 'valorant',
    teams: ['LOUD', 'Fnatic'],
    score: [8, 6],
    status: 'upcoming',
    startTime: '18:00 UTC',
  },
];

const gameColors: Record<string, string> = {
  dota2: 'bg-red-600',
  csgo: 'bg-blue-600',
  valorant: 'bg-pink-600',
  lol: 'bg-yellow-500',
  overwatch: 'bg-orange-500',
};

function EsportsDashboard() {
  const [selectedGame, setSelectedGame] = useState('all');

  const filteredMatches =
    selectedGame === 'all'
      ? matches
      : matches.filter((m) => m.game === selectedGame);

  return (
    <div className="p-6 space-y-6">
      {/* Tabs for Game Filter */}
      <Tabs defaultValue="all" onValueChange={(v) => setSelectedGame(v)}>
        <TabsList className="grid grid-cols-6 max-w-xl bg-[#1a1a1a] border border-gray-800 rounded-xl">
          <TabsTrigger
            value="all"
            className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-900 rounded-md"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="dota2"
            className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-900 rounded-md"
          >
            Dota 2
          </TabsTrigger>
          <TabsTrigger
            value="csgo"
            className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-900 rounded-md"
          >
            CS:GO
          </TabsTrigger>
          <TabsTrigger
            value="valorant"
            className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-900 rounded-md"
          >
            Valorant
          </TabsTrigger>
          <TabsTrigger
            value="lol"
            className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-900 rounded-md"
          >
            LoL
          </TabsTrigger>
          <TabsTrigger
            value="overwatch"
            className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-900 rounded-md"
          >
            Overwatch
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedGame}>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {filteredMatches.map((match) => (
              <Card
                key={match.id}
                className="rounded-2xl shadow-lg bg-[#1a1a1a] border border-gray-800"
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs text-white px-2 py-1 rounded ${
                        gameColors[match.game]
                      }`}
                    >
                      {match.game.toUpperCase()}
                    </span>
                    {match.status === 'live' && (
                      <span className="flex items-center text-red-500 text-xs">
                        <Flame className="h-4 w-4 mr-1" /> LIVE
                      </span>
                    )}
                    {match.status === 'upcoming' && (
                      <span className="flex items-center text-gray-400 text-xs">
                        <Clock className="h-4 w-4 mr-1" /> {match.startTime}
                      </span>
                    )}
                    {match.status === 'finished' && (
                      <span className="flex items-center text-green-500 text-xs">
                        <Trophy className="h-4 w-4 mr-1" /> Finished
                      </span>
                    )}
                  </div>

                  {/* Teams & Scores */}
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold">
                      {match.teams[0]}
                    </div>
                    <div className="text-2xl font-bold">
                      {match.score[0]} - {match.score[1]}
                    </div>
                    <div className="text-lg font-semibold">
                      {match.teams[1]}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
