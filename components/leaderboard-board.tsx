// components/leaderboard-board.tsx — podium + ranked table (public page and student portal)
"use client";

import { useMemo, useState } from 'react';
import { Crown, TrendingUp, Trophy, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { getSession } from '@/lib/session';
import { plural } from '@/lib/format';
import type { Leaderboard, LeaderboardEntry } from '@/lib/types';
import { Avatar, Card, DataState, EmptyState, cx } from './ui';

const PODIUM = {
  1: { ring: 'ring-gold', chip: 'bg-gold text-black', height: 'h-28', glow: 'shadow-[0_0_40px_-8px_rgba(245,183,49,0.6)]' },
  2: { ring: 'ring-gray-300', chip: 'bg-gray-300 text-black', height: 'h-20', glow: '' },
  3: { ring: 'ring-amber-700', chip: 'bg-amber-700 text-white', height: 'h-14', glow: '' },
} as const;

function PodiumSpot({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const s = PODIUM[place];
  return (
    <div className="flex w-1/3 max-w-40 flex-col items-center text-center">
      {place === 1 && <Crown size={22} className="mb-1 text-gold" />}
      <div className={cx('relative rounded-full ring-2 ring-offset-4 ring-offset-ink', s.ring, s.glow)}>
        <Avatar name={entry.name} src={entry.imageUrl} size={place === 1 ? 76 : 60} />
        <span className={cx('absolute -bottom-2 left-1/2 inline-flex size-7 -translate-x-1/2 items-center justify-center rounded-full text-xs font-bold', s.chip)}>
          {place}
        </span>
      </div>
      <p className="mt-4 w-full truncate text-sm font-semibold text-white">{entry.name}</p>
      <p className="w-full truncate text-xs text-faint">{entry.courseName ?? '—'}</p>
      <p className="mt-1 text-sm font-bold text-gold tabular-nums">{entry.points} pts</p>
      <div className={cx('mt-3 w-full rounded-t-xl border border-b-0 border-line bg-gradient-to-b from-white/[0.06] to-transparent', s.height)} />
    </div>
  );
}

export default function LeaderboardBoard({ top = 100 }: { top?: number }) {
  const { data, loading, error, reload } = useApi<Leaderboard>(`/v2/leaderboard?top=${top}`, { auth: false });
  const [course, setCourse] = useState('');
  const me = useMemo(() => getSession()?.id, []);

  const courses = useMemo(() => {
    const seen = new Map<string, string>();
    data?.entries.forEach(e => e.courseName && seen.set(e.courseId, e.courseName));
    return [...seen.entries()];
  }, [data]);

  const entries = useMemo(
    () => (course ? (data?.entries ?? []).filter(e => e.courseId === course) : data?.entries ?? []),
    [data, course],
  );
  const [first, second, third] = entries;
  const rest = entries.slice(3);

  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {courses.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by course">
          {[['', 'All courses'] as const, ...courses].map(([id, name]) => (
            <button
              key={id || 'all'}
              role="tab"
              aria-selected={course === id}
              onClick={() => setCourse(id)}
              className={cx(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                course === id ? 'border-brand bg-brand/15 text-white' : 'border-line text-muted hover:text-white',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={Trophy} title="No scores yet" description="Be the first on the board — take your course Knowledge Check." />
        </Card>
      ) : (
        <>
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {second && <PodiumSpot entry={second} place={2} />}
            {first && <PodiumSpot entry={first} place={1} />}
            {third && <PodiumSpot entry={third} place={3} />}
          </div>

          {rest.length > 0 && (
            <Card padded={false} className="overflow-hidden">
              <ol>
                {rest.map(e => (
                  <li
                    key={e.id}
                    className={cx(
                      'flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:gap-4 sm:px-5',
                      e.id === me && 'bg-brand/10',
                    )}
                  >
                    <span className="w-8 text-sm font-semibold text-faint tabular-nums">{e.rank}</span>
                    <Avatar name={e.name} src={e.imageUrl} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {e.name} {e.id === me && <span className="ml-1 text-xs font-medium text-brand-soft">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-faint">{e.courseName ?? '—'} · {plural(e.testsTaken, 'test')}</p>
                    </div>
                    <span className="text-base font-bold text-gold tabular-nums">{e.points}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-faint">
            <span className="inline-flex items-center gap-1.5"><Users size={14} /> {plural(data?.total ?? 0, 'scored student')}</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp size={14} /> Ties go to whoever finished first</span>
          </p>
        </>
      )}
    </DataState>
  );
}
