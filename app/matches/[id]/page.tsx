'use client';

import { useParams } from 'next/navigation';
import { Flame, Clock, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// ----------------------
// Type Definitions
// ----------------------
type Dota2MatchExtra = { draft: string[] };
type CSGOMatchExtra = { maps: { name: string; rounds: [number, number] }[] };
type ValorantMatchExtra = { agents: string[] };

type Match = {
  id: number;
  game: 'dota2' | 'csgo' | 'valorant';
  status: 'live' | 'finished' | 'upcoming';
  teams: [string, string];
  score: [number, number];
  timer: string;
  extra: Dota2MatchExtra | CSGOMatchExtra | ValorantMatchExtra;
};

// ----------------------
// Mock Data
// ----------------------
const mockMatches: Record<string, Match> = {
  '1': {
    id: 1,
    game: 'dota2',
    status: 'live',
    teams: ['Team Spirit', 'PSG.LGD'],
    score: [18, 12],
    timer: '32:11',
    extra: { draft: ['Juggernaut', 'Invoker', 'Earthshaker'] },
  },
  '2': {
    id: 2,
    game: 'csgo',
    status: 'finished',
    teams: ['Navi', 'G2'],
    score: [12, 16],
    timer: '--',
    extra: {
      maps: [
        { name: 'Mirage', rounds: [16, 12] },
        { name: 'Inferno', rounds: [14, 16] },
      ],
    },
  },
  '3': {
    id: 3,
    game: 'valorant',
    status: 'upcoming',
    teams: ['LOUD', 'Fnatic'],
    score: [0, 0],
    timer: '18:00 UTC',
    extra: { agents: ['Jett', 'Sova', 'Omen'] },
  },
};

// ----------------------
// Type Guards
// ----------------------
function isDota2MatchExtra(extra: unknown): extra is Dota2MatchExtra {
  return typeof extra === 'object' && extra !== null && 'draft' in extra;
}

function isCSGOMatchExtra(extra: unknown): extra is CSGOMatchExtra {
  return typeof extra === 'object' && extra !== null && 'maps' in extra;
}

function isValorantMatchExtra(extra: unknown): extra is ValorantMatchExtra {
  return typeof extra === 'object' && extra !== null && 'agents' in extra;
}

// ----------------------
// Component
// ----------------------
export default function MatchPage() {
  const params = useParams();
  const match = mockMatches[params?.id as string];

  if (!match) {
    return <div className="p-6 text-gray-200">Match not found.</div>;
  }

  return (
    <div className="p-6 space-y-6 text-gray-200">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center space-x-2 text-white">
          <span>{match.teams[0]}</span>
          <span className="text-lg font-normal text-gray-400">vs</span>
          <span>{match.teams[1]}</span>
        </h1>
        <div className="flex items-center space-x-2">
          {match.status === 'live' && (
            <span className="flex items-center text-red-500 text-sm">
              <Flame className="h-4 w-4 mr-1" /> LIVE • {match.timer}
            </span>
          )}
          {match.status === 'upcoming' && (
            <span className="flex items-center text-gray-400 text-sm">
              <Clock className="h-4 w-4 mr-1" /> {match.timer}
            </span>
          )}
          {match.status === 'finished' && (
            <span className="flex items-center text-green-500 text-sm">
              <Trophy className="h-4 w-4 mr-1" /> Finished
            </span>
          )}
        </div>
      </header>

      {/* Scoreboard */}
      <Card className="rounded-2xl shadow-lg bg-[#1a1a1a] border border-gray-800">
        <CardContent className="p-6 flex justify-between items-center text-gray-200">
          <div className="text-xl font-semibold">{match.teams[0]}</div>
          <div className="text-3xl font-bold text-white">
            {match.score[0]} - {match.score[1]}
          </div>
          <div className="text-xl font-semibold">{match.teams[1]}</div>
        </CardContent>
      </Card>

      {/* Game-specific data */}
      {match.game === 'dota2' && isDota2MatchExtra(match.extra) && (
        <Card className="bg-[#1a1a1a] border border-gray-800 rounded-xl">
          <CardContent className="p-4 text-gray-200">
            <h2 className="text-lg font-bold mb-2 text-white">Hero Draft</h2>
            <ul className="list-disc ml-6 text-gray-300">
              {match.extra.draft.map((hero, idx) => (
                <li key={idx}>{hero}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {match.game === 'csgo' && isCSGOMatchExtra(match.extra) && (
        <Card className="bg-[#1a1a1a] border border-gray-800 rounded-xl">
          <CardContent className="p-4 text-gray-200">
            <h2 className="text-lg font-bold mb-2 text-white">Map Results</h2>
            <ul className="list-disc ml-6 text-gray-300">
              {match.extra.maps.map((map, idx) => (
                <li key={idx}>
                  {map.name}: {map.rounds[0]} - {map.rounds[1]}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {match.game === 'valorant' && isValorantMatchExtra(match.extra) && (
        <Card className="bg-[#1a1a1a] border border-gray-800 rounded-xl">
          <CardContent className="p-4 text-gray-200">
            <h2 className="text-lg font-bold mb-2 text-white">Agent Picks</h2>
            <ul className="list-disc ml-6 text-gray-300">
              {match.extra.agents.map((agent, idx) => (
                <li key={idx}>{agent}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
