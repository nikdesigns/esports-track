// components/TeamFollowButton.tsx
'use client';
import React from 'react';
import useFollowedTeams from '@/hooks/useFollowedTeams';
import { Star } from 'lucide-react';

export default function TeamFollowButton({
  teamId,
}: {
  teamId: string | number;
}) {
  const { isFollowed, toggle } = useFollowedTeams();
  const followed = isFollowed(teamId);

  return (
    <button
      onClick={() => toggle(teamId)}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm transition ${
        followed
          ? 'bg-yellow-600 text-black'
          : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#232323]'
      }`}
      aria-pressed={followed}
      title={followed ? 'Unfollow team' : 'Follow team'}
    >
      <Star className="h-4 w-4" />
      <span>{followed ? 'Following' : 'Follow'}</span>
    </button>
  );
}
