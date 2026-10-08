// app/admin/tutors/page.tsx — course admins (super admin only)
"use client";

import { useState } from 'react';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Cohort, Course, Tutor } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import {
  Alert, Avatar, Badge, Button, Card, CardHeader, DataState, EmptyState, IconButton, Input, PageHeader, Select, Table, Td, Tr,
} from '@/components/ui';

export default function TutorsPage() {
  const { toast, confirm } = useFeedback();
  const courses = useApi<Course[]>('/admin/courses');
  const cohorts = useApi<Cohort[]>('/admin/cohorts');
  const tutors = useApi<Tutor[]>('/admin/admins');
  const [form, setForm] = useState({ name: '', email: '', courseId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cohortName = (id: string) => cohorts.data?.find(c => c.id === id)?.name;
  const course = (id: string) => courses.data?.find(c => c.id === id);
  // course admins only — the super admin has no courseId
  const list = (tutors.data ?? []).filter(t => t.courseId);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const tutor = await api<Tutor>('/admin/admins', { body: form });
      tutors.setData(prev => [tutor, ...(prev ?? [])]);
      setForm({ name: '', email: '', courseId: '' });
      toast(`${tutor.name} can now sign in`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Tutor) => {
    if (!(await confirm({ title: `Remove ${t.name}?`, description: 'They will lose access to the admin portal.', confirmLabel: 'Remove', danger: true }))) return;
    try {
      await api(`/admin/admins/${t.id}`, { method: 'DELETE' });
      tutors.setData(prev => (prev ?? []).filter(x => x.id !== t.id));
      toast(`${t.name} removed`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader title="Tutors" description="Course admins can manage materials, coursework and students for their course." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Add tutor" icon={UserPlus} />
          <form onSubmit={add} className="space-y-4">
            {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}
            <Input label="Full name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Select label="Course" required value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Select a course</option>
              {courses.data?.map(c => (
                <option key={c.id} value={c.id}>{c.name}{cohortName(c.cohortId) ? ` — ${cohortName(c.cohortId)}` : ''}</option>
              ))}
            </Select>
            <Button type="submit" className="w-full" loading={saving}>Create account</Button>
            <p className="text-center text-xs text-faint">Their password defaults to their first name, lowercase.</p>
          </form>
        </Card>

        <Card padded={false} className="overflow-hidden lg:col-span-2">
          <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Active tutors" icon={ShieldCheck} /></div>
          <DataState loading={tutors.loading} error={tutors.error} onRetry={tutors.reload}>
            {list.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No tutors yet" description="Add a tutor to give them access to their course." />
            ) : (
              <Table head={['Tutor', 'Course', '']}>
                {list.map(t => {
                  const c = course(t.courseId);
                  return (
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
                      <Td>
                        <Badge tone="brand">{c?.name ?? 'Unknown course'}</Badge>
                        {c && cohortName(c.cohortId) && <p className="mt-1 text-xs text-faint">{cohortName(c.cohortId)}</p>}
                      </Td>
                      <Td className="text-right"><IconButton icon={Trash2} label={`Remove ${t.name}`} tone="danger" onClick={() => remove(t)} /></Td>
                    </Tr>
                  );
                })}
              </Table>
            )}
          </DataState>
        </Card>
      </div>
    </>
  );
}
