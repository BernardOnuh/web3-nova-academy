// app/courses/[id]/page.tsx — public course detail (GET /v2/courses/:id)
"use client";

import { useParams } from 'next/navigation';
import { ArrowRight, BookOpen, CalendarDays, Clock, Target, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { plural } from '@/lib/format';
import type { Course } from '@/lib/types';
import { INTRO_LABEL, SCHEDULE_TBD } from '@/lib/programme';
import Link from 'next/link';
import CourseCover from '@/components/course-cover';
import PublicShell from '@/components/public-shell';
import { Alert, Badge, ButtonLink, Card, CardHeader, PageLoader } from '@/components/ui';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: course, loading, error } = useApi<Course>(`/v2/courses/${id}`, { auth: false });

  return (
    <PublicShell>
      {loading ? (
        <PageLoader />
      ) : error || !course ? (
        <div className="space-y-4">
          <Alert>{error ?? 'Course not found'}</Alert>
          <ButtonLink href="/courses" variant="secondary">All courses</ButtonLink>
        </div>
      ) : (
        <>
          <Link href="/courses" className="mb-4 inline-flex text-sm text-muted hover:text-white">← All courses</Link>
          <Card padded={false} className="overflow-hidden">
            <CourseCover course={course} className="h-44 sm:h-56" />
            <div className="p-6 sm:p-8">
              {course.cohort && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{course.cohort.name}</p>}
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{course.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {course.level && <Badge tone="brand">{course.level}</Badge>}
                <Badge><Clock size={11} /> {INTRO_LABEL}</Badge>
                {course._count && <Badge><Users size={11} /> {plural(course._count.students, 'student')} enrolled</Badge>}
                <Badge><CalendarDays size={11} /> {SCHEDULE_TBD}</Badge>
              </div>
              {course.description && <p className="mt-5 max-w-2xl leading-relaxed text-gray-300">{course.description}</p>}
              <div className="mt-6 flex flex-wrap gap-2">
                <ButtonLink href={`/register?course=${course.id}`} size="lg" icon={ArrowRight}>Enrol in this course</ButtonLink>
                <ButtonLink href="/leaderboard" size="lg" variant="secondary">See the leaderboard</ButtonLink>
              </div>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Curriculum" icon={BookOpen} description="Week-by-week outline" />
              {course.curriculum?.length ? (
                <ol className="relative space-y-4 border-l border-line pl-6">
                  {course.curriculum.map(w => (
                    <li key={w.id} className="relative">
                      <span className="absolute -left-[31px] top-0.5 inline-flex size-4 items-center justify-center rounded-full border border-brand bg-ink" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-soft">Week {w.week}</p>
                      <p className="font-medium text-white">{w.title}</p>
                      {w.description && <p className="mt-0.5 text-sm text-muted">{w.description}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">The detailed curriculum will be published when classes start.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="How it works" icon={Target} />
              <ol className="space-y-3 text-sm text-muted">
                <li><span className="font-semibold text-white">1.</span> Create your account and pick this course.</li>
                <li><span className="font-semibold text-white">2.</span> Take the Knowledge Check — one attempt, your score becomes points.</li>
                <li><span className="font-semibold text-white">3.</span> Climb the leaderboard as you learn.</li>
              </ol>
            </Card>
          </div>
        </>
      )}
    </PublicShell>
  );
}
