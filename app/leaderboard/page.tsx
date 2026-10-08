// app/leaderboard/page.tsx — public knowledge-test leaderboard
"use client";

import { ArrowRight, Target } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import type { Leaderboard } from '@/lib/types';
import LeaderboardBoard from '@/components/leaderboard-board';
import PublicShell from '@/components/public-shell';
import { ButtonLink } from '@/components/ui';

export default function LeaderboardPage() {
  // tiny request just for the cohort title; the board loads its own entries
  const { data } = useApi<Leaderboard>('/v2/leaderboard?top=1', { auth: false });

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-soft">
            <Target size={14} /> Knowledge Competition
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{data?.cohort?.name ?? 'Intake Leaderboard'}</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Every student takes their course&apos;s Knowledge Check. Scores become points — the board decides the top performers of the intake.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <ButtonLink href="/login" icon={ArrowRight}>Take the test</ButtonLink>
            <ButtonLink href="/register" variant="secondary">Join the intake</ButtonLink>
          </div>
        </header>

        <LeaderboardBoard />
      </div>
    </PublicShell>
  );
}
