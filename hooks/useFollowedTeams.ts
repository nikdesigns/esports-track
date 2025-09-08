// hooks/useFollowedTeams.ts
'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'esports:followed_teams_v1';

export default function useFollowedTeams() {
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFollowed(JSON.parse(raw));
    } catch {
      setFollowed({});
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(followed));
    } catch {}
  }, [followed]);

  function isFollowed(teamId: string | number) {
    return Boolean(followed[String(teamId)]);
  }

  function follow(teamId: string | number) {
    setFollowed((prev) => ({ ...prev, [String(teamId)]: true }));
  }

  function unfollow(teamId: string | number) {
    setFollowed((prev) => {
      const copy = { ...prev };
      delete copy[String(teamId)];
      return copy;
    });
  }

  function toggle(teamId: string | number) {
    setFollowed((prev) => {
      const s = String(teamId);
      const next = { ...prev };
      if (next[s]) delete next[s];
      else next[s] = true;
      return next;
    });
  }

  function allFollowedIds() {
    return Object.keys(followed);
  }

  return { followed, isFollowed, follow, unfollow, toggle, allFollowedIds };
}
