// app/admin/courses/page.tsx — V2 course catalogue (super admin)
"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ClipboardList, Clock, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { plural } from '@/lib/format';
import type { Cohort, Course } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import CourseCover from '@/components/course-cover';
import CourseFormModal from '@/components/admin/course-form';
import { Badge, Button, Card, DataState, EmptyState, IconButton, PageHeader, Select } from '@/components/ui';

export default function AdminCoursesPage() {
  const { toast, confirm } = useFeedback();
  const courses = useApi<Course[]>('/v2/admin/courses');
  const cohorts = useApi<Cohort[]>('/admin/cohorts');
  const [cohortFilter, setCohortFilter] = useState('');
  const [editing, setEditing] = useState<Course | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(
    () => (courses.data ?? []).filter(c => !cohortFilter || c.cohortId === cohortFilter),
    [courses.data, cohortFilter],
  );

  const remove = async (c: Course) => {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      description: 'This removes the course and its uploaded materials. Enrolled students will no longer have a course.',
      confirmLabel: 'Delete course',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/v2/admin/courses/${c.id}`, { method: 'DELETE' });
      courses.setData(prev => (prev ?? []).filter(x => x.id !== c.id));
      toast(`${c.name} deleted`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Courses"
        description="The tracks students can enrol in. Edit details, cover images and materials here."
        actions={
          <>
            <Select aria-label="Filter by cohort" value={cohortFilter} onChange={e => setCohortFilter(e.target.value)} wrapperClassName="w-44">
              <option value="">All cohorts</option>
              {cohorts.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button icon={Plus} onClick={() => setCreating(true)} className="h-11">New course</Button>
          </>
        }
      />

      <DataState loading={courses.loading} error={courses.error} onRetry={courses.reload}>
        {list.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon={BookOpen} title="No courses yet" action={<Button icon={Plus} onClick={() => setCreating(true)}>Create a course</Button>} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {list.map(c => (
              <Card key={c.id} padded={false} className="group flex flex-col overflow-hidden">
                <Link href={`/admin/courses/${c.id}`}><CourseCover course={c} className="h-32" /></Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/courses/${c.id}`} className="font-semibold text-white hover:text-brand-soft">{c.name}</Link>
                    <div className="-mr-2 -mt-1 flex shrink-0">
                      <IconButton icon={Pencil} label={`Edit ${c.name}`} onClick={() => setEditing(c)} />
                      <IconButton icon={Trash2} label={`Delete ${c.name}`} tone="danger" onClick={() => remove(c)} />
                    </div>
                  </div>
                  {c.cohort && <p className="text-xs text-faint">{c.cohort.name}</p>}
                  {c.description && <p className="mt-2 text-sm text-muted line-clamp-2">{c.description}</p>}
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {c.level && <Badge tone="brand">{c.level}</Badge>}
                    {c.durationWeeks && <Badge><Clock size={11} /> {c.durationWeeks}w</Badge>}
                    <Badge><Users size={11} /> {c._count?.students ?? 0}</Badge>
                    <Badge><BookOpen size={11} /> {c._count?.materials ?? 0}</Badge>
                    <Badge><ClipboardList size={11} /> {plural(c._count?.aiTests ?? 0, 'test')}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DataState>

      <CourseFormModal
        open={creating || !!editing}
        course={editing}
        cohorts={cohorts.data ?? []}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => courses.reload()}
      />
    </>
  );
}
