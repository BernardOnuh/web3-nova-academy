// components/admin/course-form.tsx — create / edit a V2 course (multipart, optional cover image)
"use client";

import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { Cohort, Course } from '@/lib/types';
import { useFeedback } from '../feedback';
import CourseCover from '../course-cover';
import { Alert, Button, FileInput, Input, Modal, Select, Textarea } from '../ui';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

interface Props {
  open: boolean;
  onClose: () => void;
  cohorts: Cohort[];
  /** edit mode when set */
  course?: Course | null;
  onSaved: (course: Course) => void;
}

// mounted only while open, so the form starts fresh from `course` each time
export default function CourseFormModal(props: Props) {
  return props.open ? <CourseForm {...props} /> : null;
}

function CourseForm({ open, onClose, cohorts, course, onSaved }: Props) {
  const { toast } = useFeedback();
  const editing = !!course;
  const [form, setForm] = useState(() => ({
    name: course?.name ?? '',
    description: course?.description ?? '',
    level: course?.level ?? '',
    durationWeeks: course?.durationWeeks ? String(course.durationWeeks) : '',
    cohortId: course?.cohortId ?? '',
  }));
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('description', form.description.trim());
    fd.append('level', form.level);
    if (form.durationWeeks) fd.append('durationWeeks', form.durationWeeks);
    if (!editing && form.cohortId) fd.append('cohortId', form.cohortId);
    if (image) fd.append('image', image);
    try {
      const saved = await api<Course>(editing ? `/v2/admin/courses/${course!.id}` : '/v2/admin/courses', {
        method: editing ? 'PATCH' : 'POST',
        form: fd,
      });
      onSaved(saved);
      toast(editing ? 'Course updated' : `${saved.name} created`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit ${course!.name}` : 'New course'}
      description={editing ? undefined : 'Courses appear in the public catalogue and the sign-up page for their intake.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="course-form" loading={saving}>{editing ? 'Save changes' : 'Create course'}</Button>
        </>
      }
    >
      <form id="course-form" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Input label="Name" required value={form.name} onChange={set('name')} placeholder="e.g. Solidity Foundations" />
        <Textarea label="Description" rows={3} value={form.description} onChange={set('description')} placeholder="What students will learn…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Level" value={form.level} onChange={set('level')}>
            <option value="">—</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Input label="Duration (weeks)" type="number" min={1} value={form.durationWeeks} onChange={set('durationWeeks')} />
          {!editing && (
            <Select label="Intake" value={form.cohortId} onChange={set('cohortId')} hint="Blank = current intake">
              <option value="">Current intake</option>
              {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </div>
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_160px]">
          <FileInput label="Cover image" accept="image/*" file={image} onChange={e => setImage(e.target.files?.[0] ?? null)} hint="Optional · up to 5MB" />
          <div className="overflow-hidden rounded-xl border border-line">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={preview} alt="" className="h-20 w-full object-cover" />
            ) : (
              <CourseCover course={{ name: form.name, imageUrl: course?.imageUrl }} className="h-20" />
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
