// app/courses/page.tsx — public intake catalogue (GET /v2/courses)
"use client";

import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, GraduationCap, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { plural } from '@/lib/format';
import type { Course } from '@/lib/types';
import { INTRO_LABEL, SCHEDULE_TBD } from '@/lib/programme';
import CourseCover from '@/components/course-cover';
import PublicShell from '@/components/public-shell';
import { Badge, ButtonLink, Card, DataState, EmptyState, PageHeader } from '@/components/ui';

interface Catalogue { cohort: { id: string; name: string; startDate: string; endDate: string } | null; courses: Course[] }

export default function CoursesPage() {
  const { data, loading, error, reload } = useApi<Catalogue>('/v2/courses', { auth: false });
  const cohort = data?.cohort;

  return (
    <PublicShell>
      <PageHeader
        eyebrow={cohort?.name ?? 'Web3Nova Academy'}
        title="Courses"
        description={`Every track opens with a ${INTRO_LABEL}. ${SCHEDULE_TBD}. Pick a track and join the intake.`}
        actions={<ButtonLink href="/register" icon={ArrowRight}>Join the intake</ButtonLink>}
      />

      <DataState loading={loading} error={error} onRetry={reload}>
        {!data?.courses.length ? (
          <Card padded={false}>
            <EmptyState icon={GraduationCap} title="No open intake right now" description="Check back when the next intake is announced." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.courses.map(c => (
              <Link key={c.id} href={`/courses/${c.id}`} className="group">
                <Card padded={false} className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-brand/40">
                  <CourseCover course={c} />
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-semibold text-white group-hover:text-brand-soft">{c.name}</h2>
                    {c.description && <p className="mt-1.5 flex-1 text-sm text-muted line-clamp-3">{c.description}</p>}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {c.level && <Badge tone="brand">{c.level}</Badge>}
                      <Badge><Clock size={11} /> {INTRO_LABEL}</Badge>
                      {c._count && <Badge><Users size={11} /> {plural(c._count.students, 'student')}</Badge>}
                      {!!c._count?.materials && <Badge><BookOpen size={11} /> {c._count.materials}</Badge>}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </DataState>
    </PublicShell>
  );
}
