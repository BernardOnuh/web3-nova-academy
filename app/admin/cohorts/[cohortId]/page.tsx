// app/admin/cohorts/[cohortId]/page.tsx — courses, students and tutors in one cohort
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, CalendarDays, FileUp, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, plural } from '@/lib/format';
import type { Cohort, Course, Student, Tutor } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { AddStudentModal, BulkStudentsModal } from '@/components/admin/student-forms';
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, DataState, EmptyState, IconButton, Input, Modal, PageHeader, PageLoader, Table, Tabs, Td, Tr,
} from '@/components/ui';

type Tab = 'courses' | 'students' | 'tutors';

export default function CohortDetailPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const { toast, confirm } = useFeedback();
  const cohorts = useApi<Cohort[]>('/admin/cohorts');
  const courses = useApi<Course[]>(`/admin/courses?cohortId=${cohortId}`);
  const students = useApi<Student[]>(`/admin/students?cohortId=${cohortId}`);
  const tutors = useApi<Tutor[]>('/admin/admins');

  const [tab, setTab] = useState<Tab>('courses');
  const [modal, setModal] = useState<'add' | 'bulk' | 'course' | null>(null);
  const [courseName, setCourseName] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  const cohort = cohorts.data?.find(c => c.id === cohortId);
  const courseList = courses.data ?? [];
  const courseIds = new Set(courseList.map(c => c.id));
  const cohortTutors = (tutors.data ?? []).filter(t => courseIds.has(t.courseId));
  const courseName_ = (id: string) => courseList.find(c => c.id === id)?.name ?? '—';

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCourse(true);
    try {
      const course = await api<Course>('/admin/courses', { body: { name: courseName.trim(), cohortId } });
      courses.setData(prev => [...(prev ?? []), { ...course, _count: { students: 0 } }]);
      toast(`${course.name} added`);
      setCourseName('');
      setModal(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSavingCourse(false);
    }
  };

  const deleteCourse = async (c: Course) => {
    if (!(await confirm({ title: `Delete ${c.name}?`, description: 'This also removes its materials, assignments and sessions.', confirmLabel: 'Delete course', danger: true }))) return;
    try {
      await api(`/v2/admin/courses/${c.id}`, { method: 'DELETE' });
      courses.setData(prev => (prev ?? []).filter(x => x.id !== c.id));
      toast(`${c.name} deleted`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const removeStudent = async (s: Student) => {
    if (!(await confirm({ title: `Remove ${s.name}?`, confirmLabel: 'Remove', danger: true }))) return;
    try {
      await api(`/admin/students/${s.id}`, { method: 'DELETE' });
      students.setData(prev => (prev ?? []).filter(x => x.id !== s.id));
      toast(`${s.name} removed`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (cohorts.loading) return <PageLoader />;
  if (!cohort) return <Alert>{cohorts.error ?? 'Cohort not found'}</Alert>;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/cohorts', label: 'Cohorts' }}
        title={cohort.name}
        description={<span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {formatDate(cohort.startDate)} – {formatDate(cohort.endDate)}</span>}
        actions={
          <>
            <Button variant="secondary" icon={FileUp} onClick={() => setModal('bulk')}>Bulk import</Button>
            <Button icon={UserPlus} onClick={() => setModal('add')}>Enrol student</Button>
          </>
        }
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'courses', label: 'Courses', icon: BookOpen, count: courseList.length },
          { id: 'students', label: 'Students', icon: Users, count: students.data?.length ?? 0 },
          { id: 'tutors', label: 'Tutors', icon: ShieldCheck, count: cohortTutors.length },
        ]}
      />

      {tab === 'courses' && (
        <DataState loading={courses.loading} error={courses.error} onRetry={courses.reload}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courseList.map(c => (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand-soft"><BookOpen size={20} /></span>
                  <IconButton icon={Trash2} label={`Delete ${c.name}`} tone="danger" onClick={() => deleteCourse(c)} />
                </div>
                <p className="mt-4 font-semibold text-white">{c.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {plural(c._count?.students ?? 0, 'student')} · {plural(c._count?.admins ?? 0, 'tutor')}
                </p>
                <Link href={`/admin/courses/${c.id}`} className="mt-4 text-sm font-semibold text-brand-soft hover:text-white">Manage course →</Link>
              </Card>
            ))}
            <button
              onClick={() => setModal('course')}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-muted transition-colors hover:border-brand hover:text-white"
            >
              <Plus size={22} /> Add course
            </button>
          </div>
        </DataState>
      )}

      {tab === 'students' && (
        <Card padded={false} className="overflow-hidden">
          <DataState loading={students.loading} error={students.error} onRetry={students.reload}>
            {!students.data?.length ? (
              <EmptyState icon={Users} title="No students in this cohort yet"
                action={<Button icon={UserPlus} onClick={() => setModal('add')}>Enrol student</Button>} />
            ) : (
              <Table head={['Student', 'Course', '']}>
                {students.data.map(s => (
                  <Tr key={s.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{s.name}</p>
                          <p className="truncate text-xs text-faint">{s.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td><Badge tone="brand">{courseName_(s.courseId)}</Badge></Td>
                    <Td className="text-right"><IconButton icon={Trash2} label={`Remove ${s.name}`} tone="danger" onClick={() => removeStudent(s)} /></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </DataState>
        </Card>
      )}

      {tab === 'tutors' && (
        <Card padded={false} className="overflow-hidden">
          <DataState loading={tutors.loading} error={tutors.error} onRetry={tutors.reload}>
            {cohortTutors.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No tutors assigned yet" action={<ButtonLink href="/admin/tutors" icon={UserPlus}>Add a tutor</ButtonLink>} />
            ) : (
              <Table head={['Tutor', 'Course']}>
                {cohortTutors.map(t => (
                  <Tr key={t.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{t.name}</p>
                          <p className="truncate text-xs text-faint">{t.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td><Badge tone="brand">{courseName_(t.courseId)}</Badge></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </DataState>
        </Card>
      )}

      <AddStudentModal
        open={modal === 'add'}
        onClose={() => setModal(null)}
        cohorts={cohorts.data ?? []}
        courses={courseList}
        cohortId={cohortId}
        onCreated={s => students.setData(prev => [s, ...(prev ?? [])])}
      />
      <BulkStudentsModal
        open={modal === 'bulk'}
        onClose={() => setModal(null)}
        cohorts={cohorts.data ?? []}
        courses={courseList}
        cohortId={cohortId}
        onDone={students.reload}
      />
      <Modal
        open={modal === 'course'}
        onClose={() => setModal(null)}
        title="Add course"
        description={`Adds a course to ${cohort.name}. You can set its description and image from Courses.`}
        size="sm"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button type="submit" form="add-course" loading={savingCourse}>Add course</Button></>}
      >
        <form id="add-course" onSubmit={addCourse}>
          <Input label="Course name" required autoFocus value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. Advanced Cryptography" />
        </form>
      </Modal>
    </>
  );
}
