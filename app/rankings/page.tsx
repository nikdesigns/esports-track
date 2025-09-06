'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Mock ranking data
type TeamRanking = {
  team: string;
  wins: number;
  losses: number;
  rating: number;
};
const mockRankings: Record<string, TeamRanking[]> = {
  dota2: [
    { team: 'Team Spirit', wins: 34, losses: 8, rating: 1895 },
    { team: 'PSG.LGD', wins: 29, losses: 11, rating: 1760 },
    { team: 'Evil Geniuses', wins: 27, losses: 13, rating: 1705 },
  ],
  csgo: [
    { team: 'Navi', wins: 45, losses: 12, rating: 2100 },
    { team: 'G2', wins: 41, losses: 15, rating: 1980 },
    { team: 'Faze Clan', wins: 39, losses: 18, rating: 1920 },
  ],
  valorant: [
    { team: 'LOUD', wins: 28, losses: 7, rating: 1650 },
    { team: 'Fnatic', wins: 25, losses: 10, rating: 1605 },
    { team: 'Sentinels', wins: 22, losses: 12, rating: 1500 },
  ],
};

export default function RankingsPage() {
  const [selectedGame, setSelectedGame] = useState('dota2');

  return (
    <div className="p-6 space-y-6 text-gray-200">
      <header>
        <h1 className="text-3xl font-bold text-white">Team Rankings</h1>
      </header>

      <Tabs defaultValue="dota2" onValueChange={(v) => setSelectedGame(v)}>
        <TabsList className="grid grid-cols-3 max-w-lg bg-[#1a1a1a] border border-gray-800 rounded-xl">
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
        </TabsList>

        <TabsContent value={selectedGame}>
          <Card className="rounded-2xl shadow-lg mt-4 bg-[#1a1a1a] border border-gray-800">
            <CardContent className="p-4 text-gray-200">
              <table className="w-full border-collapse text-left text-gray-200">
                <thead className="bg-[#1a1a1a] text-gray-300">
                  <tr className="border-b border-gray-700">
                    <th className="py-2 px-4">#</th>
                    <th className="py-2 px-4">Team</th>
                    <th className="py-2 px-4">Wins</th>
                    <th className="py-2 px-4">Losses</th>
                    <th className="py-2 px-4">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {mockRankings[selectedGame].map((team, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-700 hover:bg-gray-800"
                    >
                      <td className="py-2 px-4">{idx + 1}</td>
                      <td className="py-2 px-4">{team.team}</td>
                      <td className="py-2 px-4">{team.wins}</td>
                      <td className="py-2 px-4">{team.losses}</td>
                      <td className="py-2 px-4">{team.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
