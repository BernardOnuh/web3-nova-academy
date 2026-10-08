// app/admin/page.tsx — admin overview
"use client";

import Link from 'next/link';
import { ArrowRight, BookOpen, ClipboardList, Layers, Plus, Trophy, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/lib/use-session';
import { isSuperAdmin } from '@/lib/session';
import { formatDate, isPast, plural } from '@/lib/format';
import type { AdminTest, Cohort, Course, Leaderboard } from '@/lib/types';
import {
  Avatar, Badge, ButtonLink, Card, CardHeader, DataState, EmptyState, PageHeader, StatCard, Table, Td, Tr,
} from '@/components/ui';

function cohortStatus(c: Cohort): { label: string; tone: 'success' | 'brand' | 'neutral' } {
  if (isPast(c.endDate)) return { label: 'Ended', tone: 'neutral' };
  if (isPast(c.startDate)) return { label: 'Running', tone: 'success' };
  return { label: 'Upcoming', tone: 'brand' };
}

export default function AdminOverview() {
  const session = useSession();
  const superAdmin = isSuperAdmin(session);

  const cohorts = useApi<Cohort[]>(session && superAdmin ? '/admin/cohorts' : null);
  const courses = useApi<Course[]>(session ? '/v2/admin/courses' : null);
  const tests = useApi<AdminTest[]>(session ? '/v2/tests/admin/tests' : null);
  const board = useApi<Leaderboard>('/v2/leaderboard?top=5', { auth: false });

  const courseList = courses.data ?? [];
  const totalStudents = courseList.reduce((n, c) => n + (c._count?.students ?? 0), 0);
  const totalAttempts = (tests.data ?? []).reduce((n, t) => n + (t._count?.attempts ?? 0), 0);
  const myCourse = !superAdmin ? courseList[0] : undefined;

  return (
    <>
      <PageHeader
        eyebrow={superAdmin ? 'Super admin' : myCourse?.name ?? 'Course admin'}
        title="Overview"
        description={superAdmin ? 'Everything happening across the academy.' : 'Your course at a glance.'}
        actions={
          superAdmin ? (
            <>
              <ButtonLink href="/admin/tests/new" variant="secondary" icon={ClipboardList}>New knowledge check</ButtonLink>
              <ButtonLink href="/admin/cohorts/new" icon={Plus}>New cohort</ButtonLink>
            </>
          ) : (
            myCourse && <ButtonLink href={`/admin/courses/${myCourse.id}`} icon={ArrowRight}>Manage my course</ButtonLink>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {superAdmin ? (
          <StatCard label="Cohorts" value={cohorts.data?.length ?? 0} icon={Layers} loading={cohorts.loading} href="/admin/cohorts" />
        ) : (
          <StatCard label="Materials" value={myCourse?._count?.materials ?? 0} icon={BookOpen} loading={courses.loading} />
        )}
        <StatCard label={superAdmin ? 'Courses' : 'Knowledge checks'} value={superAdmin ? courseList.length : tests.data?.length ?? 0}
          icon={superAdmin ? BookOpen : ClipboardList} tone="success" loading={courses.loading} href={superAdmin ? '/admin/courses' : '/admin/tests'} />
        <StatCard label="Students" value={totalStudents} icon={Users} tone="gold" loading={courses.loading} href="/admin/students" />
        <StatCard label="Test attempts" value={totalAttempts} icon={Trophy} tone="warning" loading={tests.loading} href="/admin/tests" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {superAdmin ? (
          <Card padded={false} className="overflow-hidden xl:col-span-2">
            <div className="p-5 pb-0 sm:p-6 sm:pb-0">
              <CardHeader title="Cohorts" icon={Layers} action={<ButtonLink href="/admin/cohorts" variant="ghost" size="sm">View all</ButtonLink>} />
            </div>
            <DataState loading={cohorts.loading} error={cohorts.error} onRetry={cohorts.reload}>
              {!cohorts.data?.length ? (
                <EmptyState icon={Layers} title="No cohorts yet" description="Create your first academic cycle to get started."
                  action={<ButtonLink href="/admin/cohorts/new" icon={Plus}>Create cohort</ButtonLink>} />
              ) : (
                <Table head={['Cohort', 'Dates', 'Students', 'Courses', '']}>
                  {cohorts.data.map(c => {
                    const st = cohortStatus(c);
                    return (
                      <Tr key={c.id}>
                        <Td>
                          <p className="font-medium text-white">{c.name}</p>
                          <Badge tone={st.tone} className="mt-1">{st.label}</Badge>
                        </Td>
                        <Td className="whitespace-nowrap text-muted">{formatDate(c.startDate)} – {formatDate(c.endDate)}</Td>
                        <Td className="tabular-nums">{c._count?.students ?? 0}</Td>
                        <Td className="tabular-nums">{c._count?.courses ?? 0}</Td>
                        <Td className="text-right">
                          <Link href={`/admin/cohorts/${c.id}`} className="text-sm font-semibold text-brand-soft hover:text-white">Open →</Link>
                        </Td>
                      </Tr>
                    );
                  })}
                </Table>
              )}
            </DataState>
          </Card>
        ) : (
          <Card className="xl:col-span-2">
            <CardHeader title="Recent knowledge checks" icon={ClipboardList} action={<ButtonLink href="/admin/tests/new" size="sm" icon={Plus}>New</ButtonLink>} />
            <DataState loading={tests.loading} error={tests.error} onRetry={tests.reload}>
              {!tests.data?.length ? (
                <p className="text-sm text-muted">No knowledge checks for your course yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {tests.data.slice(0, 5).map(t => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{t.title}</p>
                        <p className="text-xs text-faint">{plural(t._count?.attempts ?? 0, 'attempt')} · {formatDate(t.createdAt)}</p>
                      </div>
                      <Badge tone={t.status === 'PUBLISHED' ? 'success' : 'neutral'}>{t.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </Card>
        )}

        <Card>
          <CardHeader title="Top students" icon={Trophy} action={<ButtonLink href="/leaderboard" variant="ghost" size="sm">Board</ButtonLink>} />
          <DataState loading={board.loading} error={board.error}>
            {!board.data?.entries.length ? (
              <p className="text-sm text-muted">No scores yet.</p>
            ) : (
              <ol className="space-y-3">
                {board.data.entries.map(e => (
                  <li key={e.id} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-semibold text-faint tabular-nums">{e.rank}</span>
                    <Avatar name={e.name} src={e.imageUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{e.name}</p>
                      <p className="truncate text-xs text-faint">{e.courseName}</p>
                    </div>
                    <span className="text-sm font-bold text-gold tabular-nums">{e.points}</span>
                  </li>
                ))}
              </ol>
            )}
          </DataState>
        </Card>
      </div>
    </>
  );
}
