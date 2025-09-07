// app/tournaments/page.tsx
'use client';

import { useState } from 'react';
import { Trophy, Calendar, Users } from 'lucide-react';

type Tournament = {
  name: string;
  game: string;
  startDate: string;
  endDate: string;
  prizePool: string;
  format: string;
  upcomingMatches: string[];
};

const mockTournaments: Tournament[] = [
  {
    name: 'The International 2025',
    game: 'Dota 2',
    startDate: '2025-10-12',
    endDate: '2025-10-29',
    prizePool: '$40,000,000',
    format: 'Double Elimination',
    upcomingMatches: ['Team Spirit vs PSG.LGD', 'Evil Geniuses vs Liquid'],
  },
  {
    name: 'PGL Major',
    game: 'CS:GO',
    startDate: '2025-07-05',
    endDate: '2025-07-20',
    prizePool: '$2,000,000',
    format: 'Swiss Stage + Playoffs',
    upcomingMatches: ['NaVi vs G2', 'Faze vs Astralis'],
  },
  {
    name: 'Valorant Champions',
    game: 'Valorant',
    startDate: '2025-08-01',
    endDate: '2025-08-15',
    prizePool: '$1,000,000',
    format: 'Group Stage + Knockout',
    upcomingMatches: ['Fnatic vs Sentinels', 'LOUD vs DRX'],
  },
];

export default function TournamentsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="p-6 space-y-6 text-gray-200">
      <h1 className="text-3xl font-bold text-white">Tournaments</h1>

      <div className="bg-[#121212] border border-gray-800 rounded-lg divide-y divide-gray-800">
        {mockTournaments.map((tournament, idx) => (
          <div key={tournament.name}>
            {/* Row */}
            <div
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="grid grid-cols-4 px-4 py-3 hover:bg-[#1a1a1a] cursor-pointer"
            >
              <span className="font-semibold">{tournament.name}</span>
              <span>{tournament.game}</span>
              <span>{tournament.startDate}</span>
              <span>{tournament.endDate}</span>
            </div>

            {/* Expanded */}
            {expanded === idx && (
              <div className="px-6 py-3 bg-[#1a1a1a] border-t border-gray-800 text-sm text-gray-300">
                <p className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold text-white">Prize Pool:</span>
                  <span>{tournament.prizePool}</span>
                </p>
                <p className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-white">Format:</span>
                  <span>{tournament.format}</span>
                </p>
                <div className="mt-2">
                  <p className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-400" />
                    <span className="font-semibold text-white">
                      Upcoming Matches:
                    </span>
                  </p>
                  <ul className="list-disc list-inside ml-6">
                    {tournament.upcomingMatches.map((match) => (
                      <li key={match}>{match}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
