// app/admin/courses/[courseId]/page.tsx — manage one course
"use client";

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, CalendarRange, ClipboardList, Clock, FileText, Pencil, Plus, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/lib/use-session';
import { isSuperAdmin } from '@/lib/session';
import { formatDate, plural } from '@/lib/format';
import type { AdminTest, Cohort, Course, Student } from '@/lib/types';
import CourseCover from '@/components/course-cover';
import CourseFormModal from '@/components/admin/course-form';
import LibraryTab from '@/components/admin/course-tabs/library-tab';
import CurriculumTab from '@/components/admin/course-tabs/curriculum-tab';
import AssessmentsTab from '@/components/admin/course-tabs/assessments-tab';
import AttendanceTab from '@/components/admin/course-tabs/attendance-tab';
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, DataState, EmptyState, PageLoader, Table, Tabs, Td, Tr,
} from '@/components/ui';

type Tab = 'library' | 'curriculum' | 'assessments' | 'attendance' | 'tests' | 'students';
const TABS: Tab[] = ['library', 'curriculum', 'assessments', 'attendance', 'tests', 'students'];

function TestsTab({ courseId }: { courseId: string }) {
  const tests = useApi<AdminTest[]>('/v2/tests/admin/tests');
  const list = (tests.data ?? []).filter(t => t.courseId === courseId);
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Knowledge Checks add to students&apos; leaderboard points.</p>
        <ButtonLink href={`/admin/tests/new?course=${courseId}`} icon={Plus}>New knowledge check</ButtonLink>
      </div>
      <DataState loading={tests.loading} error={tests.error} onRetry={tests.reload}>
        {list.length === 0 ? (
          <Card padded={false}><EmptyState icon={ClipboardList} title="No knowledge checks for this course" /></Card>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <Table head={['Test', 'Status', 'Attempts', 'Created']}>
              {list.map(t => (
                <Tr key={t.id}>
                  <Td className="font-medium text-white">{t.title}</Td>
                  <Td><Badge tone={t.status === 'PUBLISHED' ? 'success' : 'neutral'}>{t.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge></Td>
                  <Td className="tabular-nums">{t._count?.attempts ?? 0}</Td>
                  <Td className="text-muted">{formatDate(t.createdAt)}</Td>
                </Tr>
              ))}
            </Table>
          </Card>
        )}
      </DataState>
    </>
  );
}

function StudentsTab({ courseId }: { courseId: string }) {
  const students = useApi<Student[]>('/admin/students');
  const list = (students.data ?? []).filter(s => s.courseId === courseId);
  return (
    <DataState loading={students.loading} error={students.error} onRetry={students.reload}>
      {list.length === 0 ? (
        <Card padded={false}><EmptyState icon={Users} title="No students enrolled yet" action={<ButtonLink href="/admin/students" variant="secondary">Go to Students</ButtonLink>} /></Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <Table head={['Student', 'Email', 'Joined']}>
            {list.map(s => (
              <Tr key={s.id}>
                <Td><div className="flex items-center gap-3"><Avatar name={s.name} size={30} /><span className="font-medium text-white">{s.name}</span></div></Td>
                <Td className="text-muted">{s.email}</Td>
                <Td className="text-muted">{formatDate(s.createdAt)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}
    </DataState>
  );
}

function CourseManager() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const superAdmin = isSuperAdmin(session);
  const course = useApi<Course>(`/v2/courses/${courseId}`, { auth: false });
  const cohorts = useApi<Cohort[]>(superAdmin ? '/admin/cohorts' : null);
  const [editing, setEditing] = useState(false);

  const requested = params.get('tab') as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : 'library';
  const setTab = (t: Tab) => router.replace(`/admin/courses/${courseId}?tab=${t}`, { scroll: false });

  const c = course.data;
  const counts = c?._count;

  if (course.loading) return <PageLoader />;
  if (course.error || !c) return <Alert>{course.error ?? 'Course not found'}</Alert>;
  if (session && !superAdmin && session.courseId !== c.id) {
    return <Alert>You can only manage your own course.</Alert>;
  }

  return (
    <>
      {superAdmin && (
        <Link href={c.cohort ? `/admin/cohorts/${c.cohortId}` : '/admin/courses'} className="mb-4 inline-flex text-sm text-muted hover:text-white">
          ← {c.cohort?.name ?? 'Courses'}
        </Link>
      )}

      <Card padded={false} className="mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <CourseCover course={c} className="h-32 sm:h-auto sm:w-56" />
          <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              {c.cohort && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{c.cohort.name}</p>}
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{c.name}</h1>
              {c.description && <p className="mt-2 max-w-2xl text-sm text-muted line-clamp-2">{c.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {c.level && <Badge tone="brand">{c.level}</Badge>}
                {c.durationWeeks && <Badge><Clock size={11} /> {plural(c.durationWeeks, 'week')}</Badge>}
                <Badge><Users size={11} /> {plural(counts?.students ?? 0, 'student')}</Badge>
                <Badge><BookOpen size={11} /> {plural(counts?.materials ?? 0, 'file')}</Badge>
              </div>
            </div>
            {superAdmin && <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit course</Button>}
          </div>
        </div>
      </Card>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'library', label: 'Library', icon: BookOpen },
          { id: 'curriculum', label: 'Curriculum & assignments', icon: CalendarRange },
          { id: 'assessments', label: 'Assessments', icon: FileText },
          { id: 'attendance', label: 'Attendance', icon: Clock },
          { id: 'tests', label: 'Knowledge checks', icon: ClipboardList, count: counts?.aiTests },
          { id: 'students', label: 'Students', icon: Users, count: counts?.students },
        ]}
      />

      {tab === 'library' && <LibraryTab courseId={c.id} />}
      {tab === 'curriculum' && <CurriculumTab courseId={c.id} cohortId={c.cohortId} canSeed={superAdmin} />}
      {tab === 'assessments' && <AssessmentsTab courseId={c.id} cohortId={c.cohortId} />}
      {tab === 'attendance' && <AttendanceTab courseId={c.id} cohortId={c.cohortId} />}
      {tab === 'tests' && <TestsTab courseId={c.id} />}
      {tab === 'students' && <StudentsTab courseId={c.id} />}

      {superAdmin && (
        <CourseFormModal open={editing} course={c} cohorts={cohorts.data ?? []} onClose={() => setEditing(false)} onSaved={course.reload} />
      )}
    </>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CourseManager />
    </Suspense>
  );
}
