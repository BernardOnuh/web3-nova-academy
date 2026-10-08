// app/student/leaderboard/page.tsx
"use client";

import LeaderboardBoard from '@/components/leaderboard-board';
import { PageHeader } from '@/components/ui';

export default function StudentLeaderboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Knowledge Competition"
        title="Leaderboard"
        description="Your Knowledge Check scores become points. The top performers are recognised at the end of the intake."
      />
      <LeaderboardBoard />
    </>
  );
}
