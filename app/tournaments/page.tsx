'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Mock tournament data
interface Tournament {
  id: number;
  name: string;
  game: string;
  status: 'upcoming' | 'live' | 'finished';
  date: string;
  teams: string[];
}

const mockTournaments: Tournament[] = [
  {
    id: 1,
    name: 'The International 12',
    game: 'dota2',
    status: 'live',
    date: 'Ongoing',
    teams: ['Team Spirit', 'PSG.LGD', 'Evil Geniuses'],
  },
  {
    id: 2,
    name: 'ESL One Cologne',
    game: 'csgo',
    status: 'upcoming',
    date: '2025-10-12',
    teams: ['Navi', 'G2', 'Faze Clan'],
  },
  {
    id: 3,
    name: 'VALORANT Champions',
    game: 'valorant',
    status: 'finished',
    date: '2025-07-15',
    teams: ['LOUD', 'Fnatic', 'Sentinels'],
  },
];

export default function TournamentsPage() {
  const [selectedGame, setSelectedGame] = useState<
    'all' | 'dota2' | 'csgo' | 'valorant'
  >('all');

  const filteredTournaments =
    selectedGame === 'all'
      ? mockTournaments
      : mockTournaments.filter((t) => t.game === selectedGame);

  return (
    <div className="p-6 space-y-6 text-gray-200">
      <header>
        <h1 className="text-3xl font-bold text-white">Tournaments</h1>
      </header>

      {/* Tabs */}
      <Tabs
        defaultValue="all"
        onValueChange={(v) =>
          setSelectedGame(v as 'all' | 'dota2' | 'csgo' | 'valorant')
        }
      >
        <TabsList className="grid grid-cols-4 max-w-lg bg-[#121212] border border-gray-700 rounded-xl">
          <TabsTrigger
            value="all"
            className="text-gray-400 hover:text-white data-[state=active]:bg-gray-800 data-[state=active]:text-white rounded-lg"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="dota2"
            className="text-gray-400 hover:text-white data-[state=active]:bg-gray-800 data-[state=active]:text-white rounded-lg"
          >
            Dota 2
          </TabsTrigger>
          <TabsTrigger
            value="csgo"
            className="text-gray-400 hover:text-white data-[state=active]:bg-gray-800 data-[state=active]:text-white rounded-lg"
          >
            CS:GO
          </TabsTrigger>
          <TabsTrigger
            value="valorant"
            className="text-gray-400 hover:text-white data-[state=active]:bg-gray-800 data-[state=active]:text-white rounded-lg"
          >
            Valorant
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedGame}>
          <div className="space-y-4 mt-4">
            {filteredTournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className="bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-lg"
              >
                <CardContent className="p-4">
                  <h2 className="text-xl font-bold text-white">
                    {tournament.name}
                  </h2>
                  <p className="text-gray-400">
                    Game: {tournament.game.toUpperCase()}
                  </p>
                  <p className="text-gray-400">Date: {tournament.date}</p>
                  <p className="text-gray-400">
                    Status:{' '}
                    <span
                      className={
                        tournament.status === 'live'
                          ? 'text-red-500'
                          : tournament.status === 'finished'
                          ? 'text-green-500'
                          : 'text-gray-300'
                      }
                    >
                      {tournament.status.toUpperCase()}
                    </span>
                  </p>
                  <p className="text-gray-300 mt-2">
                    Teams: {tournament.teams.join(', ')}
                  </p>
                </CardContent>
              </Card>
            ))}
            {filteredTournaments.length === 0 && (
              <p className="text-gray-400">
                No tournaments found for this game.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
