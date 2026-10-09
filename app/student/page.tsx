// app/student/page.tsx — student dashboard
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, BookOpen, CheckSquare, Clock, FileText, Gift, GraduationCap, Lock, Target, Trophy,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { isPast } from '@/lib/format';
import { useCountdown } from '@/lib/use-countdown';
import type { InviteTask, Leaderboard, Profile, TestSummary } from '@/lib/types';
import { INVITE_POINTS } from '@/lib/programme';
import { INTRO_LABEL } from '@/lib/programme';
import { Alert, Avatar, Badge, ButtonLink, Card, CardHeader, PageHeader, Skeleton, StatCard } from '@/components/ui';

interface Coursework {
  attended: number;
  pendingAssignments: number;
  upcomingAssessments: number;
}

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export default function StudentDashboard() {
  const profile = useApi<Profile>('/v2/auth/me');
  const tests = useApi<TestSummary[]>('/v2/tests');
  const invite = useApi<InviteTask>('/v2/tasks/invite');
  const [rank, setRank] = useState<number | null>(null);
  const [work, setWork] = useState<Coursework | null>(null);

  // rank from the public leaderboard
  useEffect(() => {
    if (!profile.data) return;
    api<Leaderboard>(`/v2/leaderboard?top=200`, { auth: false })
      .then(b => setRank(b.entries.find(e => e.id === profile.data!.id)?.rank ?? null))
      .catch(() => {});
  }, [profile.data]);

  // V1 coursework counters — each endpoint may be empty for new intakes
  useEffect(() => {
    const get = (p: string) => api<unknown>(p).catch(() => []);
    Promise.all([get('/student/attendance'), get('/student/assignments'), get('/student/assessments')]).then(
      ([att, asg, ass]) =>
        setWork({
          attended: asArray(att).length,
          pendingAssignments: asArray<{ closeAt: string }>(asg).filter(a => !isPast(a.closeAt)).length,
          upcomingAssessments: asArray<{ dueDate: string }>(ass).filter(a => !isPast(a.dueDate)).length,
        }),
    );
  }, []);

  const p = profile.data;
  const openTests = (tests.data ?? []).filter(t => !t.taken);
  const lockedUntil = (tests.data ?? []).find(t => t.lockedUntil)?.lockedUntil ?? p?.firstTestUnlocksAt ?? null;
  const unlock = useCountdown(lockedUntil);
  const firstName = p?.name?.split(' ')[0] || p?.studentName;

  return (
    <>
      <PageHeader
        eyebrow={p ? [p.course?.name, p.cohort?.name].filter(Boolean).join(' · ') || 'Web3Nova Academy' : undefined}
        title={profile.loading ? <Skeleton className="h-9 w-64" /> : `Welcome back${firstName ? `, ${firstName}` : ''}`}
        description="Here's where you stand in your course."
      />

      {profile.error && <Alert className="mb-6">{profile.error}</Alert>}

      {/* first-test countdown (24h after the welcome tour) */}
      {lockedUntil && !unlock?.done && (
        <Card className="mb-6 border-gold/30 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-gold">
              <Lock size={22} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-white">Your Knowledge Check unlocks in <span className="tabular-nums text-gold">{unlock?.label ?? '—'}</span></p>
              <p className="text-sm text-muted">Come back then to take it and climb the leaderboard.</p>
            </div>
            <ButtonLink href="/student/leaderboard" variant="secondary" icon={Trophy}>Leaderboard</ButtonLink>
          </div>
        </Card>
      )}

      {/* Knowledge Check call-to-action */}
      {openTests.length > 0 && !(lockedUntil && !unlock?.done) && (
        <Card className="mb-6 border-brand/30 bg-gradient-to-r from-brand/15 via-brand/5 to-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand/20 text-brand-soft">
              <Target size={24} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-white">
                {openTests.length === 1 ? openTests[0].title : `${openTests.length} knowledge checks are open`}
              </p>
              <p className="text-sm text-muted">One attempt only — your score is added to your leaderboard points.</p>
            </div>
            <ButtonLink href="/student/diagnostic" icon={ArrowRight}>Take it now</ButtonLink>
          </div>
        </Card>
      )}

      {/* bonus task: invite friends (+100 on approval) */}
      {invite.data && invite.data.state !== 'APPROVED' && (
        <Card className="mb-6 border-success/30 bg-gradient-to-r from-success/10 via-success/5 to-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Gift size={22} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-white">
                {invite.data.state === 'PENDING' ? 'Your invite proof is being reviewed' : `Earn ${INVITE_POINTS} more points`}
              </p>
              <p className="text-sm text-muted">
                {invite.data.state === 'PENDING'
                  ? `+${INVITE_POINTS} points land as soon as an admin approves it.`
                  : invite.data.state === 'REJECTED'
                    ? 'Your last proof was not accepted — send a new screenshot.'
                    : 'Go to the WhatsApp group, share the pinned post with your friends, then send proof.'}
              </p>
            </div>
            {invite.data.state !== 'PENDING' && <ButtonLink href="/student/invite" icon={ArrowRight}>Invite friends</ButtonLink>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Points" value={p?.points ?? 0} icon={Trophy} tone="gold" loading={profile.loading}
          hint={rank ? `#${rank} on the leaderboard` : 'Not ranked yet'} href="/student/leaderboard" />
        <StatCard label="Sessions attended" value={work?.attended ?? 0} icon={Clock} loading={!work} href="/student/attendance" />
        <StatCard label="Pending assignments" value={work?.pendingAssignments ?? 0} icon={CheckSquare} tone="warning" loading={!work} href="/student/assignments" />
        <StatCard label="Upcoming assessments" value={work?.upcomingAssessments ?? 0} icon={FileText} tone="success" loading={!work} href="/student/assessments" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Course card */}
        <Card className="lg:col-span-3">
          <CardHeader title="My course" icon={BookOpen} action={<ButtonLink href="/student/materials" variant="secondary" size="sm">Open library</ButtonLink>} />
          {profile.loading ? (
            <div className="space-y-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ) : p?.course ? (
            <div>
              <h3 className="text-xl font-bold text-white">{p.course.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.course.level && <Badge tone="brand">{p.course.level}</Badge>}
                <Badge>{INTRO_LABEL}</Badge>
                {p.cohort && <Badge tone="gold">{p.cohort.name}</Badge>}
              </div>
              {p.course.description && <p className="mt-4 text-sm leading-relaxed text-muted">{p.course.description}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted">You&apos;re not enrolled in a course yet.</p>
          )}
        </Card>

        {/* Profile card */}
        <Card className="lg:col-span-2">
          <CardHeader title="My profile" action={<ButtonLink href="/student/profile" variant="ghost" size="sm">Edit</ButtonLink>} />
          {p ? (
            <div className="flex items-center gap-4">
              <Avatar name={p.name} src={p.imageUrl} size={56} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{p.name}</p>
                {p.studentName && <p className="text-sm text-muted">@{p.studentName}</p>}
              </div>
            </div>
          ) : (
            <Skeleton className="h-14 w-full" />
          )}
          {p?.expectation && (
            <blockquote className="mt-5 border-l-2 border-gold/50 pl-3 text-sm italic text-muted line-clamp-4">“{p.expectation}”</blockquote>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { title: 'Knowledge Check', desc: 'Your course diagnostic test', href: '/student/diagnostic', icon: Target },
          { title: 'Library', desc: 'Materials and class recordings', href: '/student/materials', icon: BookOpen },
          { title: 'Grades', desc: 'Scores for assignments and tests', href: '/student/grades', icon: GraduationCap },
        ].map(card => (
          <Link key={card.href} href={card.href} className="group">
            <Card className="flex items-center gap-4 transition-colors group-hover:border-brand/40">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white/[0.04] text-brand-soft">
                <card.icon size={20} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-white">{card.title}</p>
                <p className="text-sm text-muted">{card.desc}</p>
              </div>
              <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-soft" />
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
