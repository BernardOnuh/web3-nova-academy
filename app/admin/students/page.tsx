// app/admin/students/page.tsx — student directory
"use client";

import { useMemo, useState } from 'react';
import { FileUp, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/lib/use-session';
import { formatDate, plural } from '@/lib/format';
import type { Cohort, Course, Student } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { AddStudentModal, BulkStudentsModal } from '@/components/admin/student-forms';
import {
  Avatar, Badge, Button, Card, DataState, EmptyState, IconButton, Input, PageHeader, Select, Table, Td, Tr,
} from '@/components/ui';

export default function StudentsAdminPage() {
  const session = useSession();
  const { toast, confirm } = useFeedback();
  const cohorts = useApi<Cohort[]>('/admin/cohorts');
  const courses = useApi<Course[]>('/admin/courses');
  const students = useApi<Student[]>('/admin/students');

  const [query, setQuery] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [modal, setModal] = useState<'add' | 'bulk' | null>(null);

  const cohortName = (id: string) => cohorts.data?.find(c => c.id === id)?.name ?? '—';
  const courseName = (id: string) => courses.data?.find(c => c.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (students.data ?? [])
      .filter(s => !cohortFilter || s.cohortId === cohortFilter)
      .filter(s => !courseFilter || s.courseId === courseFilter)
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [students.data, query, cohortFilter, courseFilter]);

  const remove = async (s: Student) => {
    const ok = await confirm({ title: `Remove ${s.name}?`, description: 'Their submissions, grades and attendance will be removed too.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/students/${s.id}`, { method: 'DELETE' });
      students.setData(list => (list ?? []).filter(x => x.id !== s.id));
      toast(`${s.name} removed`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const courseOptions = (courses.data ?? []).filter(c => !cohortFilter || c.cohortId === cohortFilter);
  const shared = {
    cohorts: cohorts.data ?? [],
    courses: courses.data ?? [],
    lockCourseId: session?.courseId ?? null,
    onClose: () => setModal(null),
  };

  return (
    <>
      <PageHeader
        title="Students"
        description="Enrol students and manage the academy directory."
        actions={
          <>
            <Button variant="secondary" icon={FileUp} onClick={() => setModal('bulk')}>Bulk import</Button>
            <Button icon={UserPlus} onClick={() => setModal('add')}>Enrol student</Button>
          </>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row">
          <Input icon={Search} placeholder="Search by name or email…" value={query} onChange={e => setQuery(e.target.value)} wrapperClassName="flex-1" aria-label="Search students" />
          {!session?.courseId && (
            <>
              <Select aria-label="Filter by cohort" value={cohortFilter} onChange={e => { setCohortFilter(e.target.value); setCourseFilter(''); }} wrapperClassName="md:w-48">
                <option value="">All cohorts</option>
                {cohorts.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select aria-label="Filter by course" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} wrapperClassName="md:w-48">
                <option value="">All courses</option>
                {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </>
          )}
        </div>

        <DataState loading={students.loading} error={students.error} onRetry={students.reload}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={students.data?.length ? 'No students match these filters' : 'No students yet'}
              description={students.data?.length ? 'Try clearing the search or filters.' : 'Enrol one student or import a CSV.'}
            />
          ) : (
            <>
              <Table head={['Student', 'Cohort', 'Course', 'Joined', '']}>
                {filtered.map(s => (
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
                    <Td className="whitespace-nowrap text-muted">{cohortName(s.cohortId)}</Td>
                    <Td><Badge tone="brand">{courseName(s.courseId)}</Badge></Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(s.createdAt)}</Td>
                    <Td className="text-right">
                      <IconButton icon={Trash2} label={`Remove ${s.name}`} tone="danger" onClick={() => remove(s)} />
                    </Td>
                  </Tr>
                ))}
              </Table>
              <p className="border-t border-line px-5 py-3 text-xs text-faint">
                Showing {plural(filtered.length, 'student')}{filtered.length !== students.data?.length && ` of ${students.data?.length}`}
              </p>
            </>
          )}
        </DataState>
      </Card>

      <AddStudentModal
        {...shared}
        open={modal === 'add'}
        cohortId={cohortFilter || undefined}
        onCreated={s => students.setData(list => [s, ...(list ?? [])])}
      />
      <BulkStudentsModal {...shared} open={modal === 'bulk'} cohortId={cohortFilter || undefined} onDone={students.reload} />
    </>
  );
}
