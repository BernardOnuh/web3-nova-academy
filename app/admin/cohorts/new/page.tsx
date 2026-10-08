// app/admin/cohorts/new/page.tsx — create cohort + its courses
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, Layers, Plus, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import type { Cohort } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { Alert, Button, Card, IconButton, Input, PageHeader } from '@/components/ui';

const DEFAULT_COURSES = ['UI/UX', 'Web Development', 'Smart Contracts', 'Rust & Protocol', 'AI & Automation'];

export default function CreateCohortPage() {
  const router = useRouter();
  const { toast } = useFeedback();
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [courses, setCourses] = useState<string[]>(DEFAULT_COURSES);
  const [newCourse, setNewCourse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCourse = () => {
    const name = newCourse.trim();
    if (!name || courses.some(c => c.toLowerCase() === name.toLowerCase())) return;
    setCourses(c => [...c, name]);
    setNewCourse('');
  };

  const datesInvalid = !!form.startDate && !!form.endDate && form.endDate < form.startDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (datesInvalid) return;
    setSaving(true);
    setError(null);
    try {
      const cohort = await api<Cohort>('/admin/cohorts', { body: form });
      const results = await Promise.allSettled(
        courses.map(name => api('/admin/courses', { body: { name, cohortId: cohort.id } })),
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      toast(
        failed ? `Cohort created, but ${failed} course${failed === 1 ? '' : 's'} failed — add them from the cohort page.` : `Cohort created with ${courses.length} courses`,
        failed ? 'error' : 'success',
      );
      router.push(`/admin/cohorts/${cohort.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={{ href: '/admin/cohorts', label: 'Cohorts' }} title="New cohort" description="Set up an academic cycle and the courses it runs." />

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}
          <Input label="Cohort name" icon={Layers} required placeholder="e.g. Cohort III" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start date" icon={CalendarDays} type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End date" icon={CalendarDays} type="date" required value={form.endDate} min={form.startDate || undefined}
              onChange={e => setForm({ ...form, endDate: e.target.value })} error={datesInvalid ? 'End date must be after the start date.' : null} />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-200"><BookOpen size={14} /> Courses ({courses.length})</p>
            <ul className="mb-3 space-y-2">
              {courses.map((c, i) => (
                <li key={c} className="flex items-center justify-between rounded-xl border border-line bg-ink/50 py-1.5 pl-4 pr-1.5 text-sm text-white">
                  {c}
                  <IconButton icon={X} label={`Remove ${c}`} tone="danger" onClick={() => setCourses(courses.filter((_, j) => j !== i))} />
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                placeholder="Add a course…"
                value={newCourse}
                onChange={e => setNewCourse(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCourse(); } }}
                wrapperClassName="flex-1"
                aria-label="New course name"
              />
              <Button variant="secondary" icon={Plus} onClick={addCourse} className="h-11">Add</Button>
            </div>
          </div>
        </Card>

        <Button type="submit" size="lg" className="mt-5 w-full" loading={saving} disabled={!courses.length || datesInvalid}>
          Create cohort with {courses.length} course{courses.length === 1 ? '' : 's'}
        </Button>
      </form>
    </div>
  );
}
