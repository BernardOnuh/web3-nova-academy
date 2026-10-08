// components/leaderboard-carousel.tsx — rotating "top students" card for the landing + login pages
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { plural } from '@/lib/format';
import type { Leaderboard } from '@/lib/types';
import { Avatar, Skeleton, cx } from './ui';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-gold text-black',
  2: 'bg-gray-300 text-black',
  3: 'bg-amber-700 text-white',
};

export default function LeaderboardCarousel({ limit = 5, compact = false }: { limit?: number; compact?: boolean }) {
  const { data, loading } = useApi<Leaderboard>(`/v2/leaderboard?top=${limit}`, { auth: false });
  const entries = data?.entries ?? [];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || entries.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIdx(i => (i + 1) % entries.length), 4000);
    return () => clearInterval(t);
  }, [paused, entries.length]);

  if (loading) return <Skeleton className={compact ? 'h-[72px] w-full rounded-2xl' : 'h-24 w-full rounded-2xl'} />;

  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-line bg-surface/70 p-5 text-center">
        <Trophy size={20} className="mx-auto mb-2 text-gold" />
        <p className="text-sm text-muted">No scores yet — be the first on the leaderboard.</p>
      </div>
    );
  }

  const go = (n: number) => setIdx((n + entries.length) % entries.length);
  const e = entries[idx % entries.length];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
          <Trophy size={14} className="text-gold" /> Top students
        </h3>
        <Link href="/leaderboard" className="text-xs font-medium text-brand-soft hover:text-white">View all →</Link>
      </div>

      <div className={cx('group relative overflow-hidden rounded-2xl border border-line bg-surface/70', compact ? 'p-4' : 'p-5')} aria-live="polite">
        <div key={e.id} className="flex items-center gap-3 sm:gap-4 animate-fade-up">
          <span className={cx('inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', RANK_STYLES[e.rank] ?? 'bg-surface-2 text-gray-200')}>
            {e.rank}
          </span>
          <Avatar name={e.name} src={e.imageUrl} size={compact ? 40 : 48} />
          <div className="min-w-0 flex-1">
            <p className={cx('truncate font-semibold text-white', compact ? 'text-sm' : 'text-base')}>{e.name}</p>
            <p className="truncate text-xs text-muted">{e.courseName || '—'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cx('font-bold text-gold tabular-nums', compact ? 'text-lg' : 'text-2xl')}>{e.points}</p>
            <p className="text-xs text-faint">pts · {plural(e.testsTaken, 'test')}</p>
          </div>
        </div>

        {entries.length > 1 && (
          <>
            <button aria-label="Previous student" onClick={() => go(idx - 1)}
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100">
              <ChevronLeft size={16} />
            </button>
            <button aria-label="Next student" onClick={() => go(idx + 1)}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100">
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {entries.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {entries.map((x, i) => (
            <button
              key={x.id}
              aria-label={`Show #${x.rank}`}
              onClick={() => setIdx(i)}
              className={cx('h-1.5 rounded-full transition-all', i === idx ? 'w-6 bg-brand' : 'w-1.5 bg-line-strong hover:bg-faint')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
