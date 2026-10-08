// app/admin/tests/new/page.tsx — build + publish a Knowledge Check (POST /v2/admin/tests)
"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, Plus, Send, Trash2, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/lib/use-session';
import type { Course } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { Alert, Badge, Button, Card, CardHeader, IconButton, Input, PageHeader, PageLoader, Select, Textarea, cx } from '@/components/ui';

const LETTERS = 'ABCDEFGHIJ';
const MAX_OPTIONS = 10;
const MAX_QUESTIONS = 50;

interface Q { q: string; options: string[]; answer: number | null }
const blank = (): Q => ({ q: '', options: ['', '', '', ''], answer: null });

function Builder() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const { toast } = useFeedback();
  const courses = useApi<Course[]>('/v2/admin/courses');

  const [meta, setMeta] = useState({ title: '', description: '', courseId: params.get('course') ?? '', opensAt: '', closesAt: '' });
  const [questions, setQuestions] = useState<Q[]>([blank()]);
  const [saving, setSaving] = useState<'DRAFT' | 'PUBLISHED' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // course admins are locked to their course
  const courseId = session?.courseId ?? meta.courseId;
  const course = courses.data?.find(x => x.id === courseId);
  const defaultTitle = course ? `Knowledge Check — ${course.name}` : '';
  const title = meta.title.trim() || defaultTitle;

  const updateQ = (i: number, patch: Partial<Q>) => setQuestions(qs => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const validate = () => {
    if (!courseId) return 'Choose a course.';
    if (!title) return 'Give the test a title.';
    if (meta.opensAt && meta.closesAt && meta.closesAt <= meta.opensAt) return 'Closing time must be after opening time.';
    for (const [i, q] of questions.entries()) {
      const filled = q.options.filter(o => o.trim());
      if (!q.q.trim()) return `Question ${i + 1} is missing its text.`;
      if (filled.length < 2) return `Question ${i + 1} needs at least 2 options.`;
      if (filled.length !== q.options.length) return `Question ${i + 1} has an empty option — fill it in or remove it.`;
      if (q.answer === null) return `Question ${i + 1}: mark the correct answer.`;
    }
    return null;
  };

  const save = async (status: 'DRAFT' | 'PUBLISHED') => {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    setSaving(status);
    try {
      await api('/v2/tests/admin/tests', {
        body: {
          title,
          description: meta.description.trim() || undefined,
          courseId,
          status,
          opensAt: meta.opensAt ? new Date(meta.opensAt).toISOString() : undefined,
          closesAt: meta.closesAt ? new Date(meta.closesAt).toISOString() : undefined,
          questions: questions.map(q => ({ q: q.q.trim(), options: q.options.map(o => o.trim()), answer: LETTERS[q.answer!] })),
        },
      });
      toast(status === 'PUBLISHED' ? 'Knowledge check published' : 'Saved as draft');
      router.push('/admin/tests');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(null);
    }
  };

  if (courses.loading) return <PageLoader />;
  const ready = questions.filter(q => q.q.trim() && q.answer !== null).length;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <PageHeader back={{ href: '/admin/tests', label: 'Knowledge Checks' }} title="New knowledge check" description="Students get one attempt. Their percentage score becomes leaderboard points." />

      {courses.error && <Alert className="mb-4">{courses.error}</Alert>}

      <Card className="mb-6">
        <CardHeader title="Details" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Course" required value={courseId} disabled={!!session?.courseId} onChange={e => setMeta({ ...meta, courseId: e.target.value })} wrapperClassName="sm:col-span-2">
            <option value="">Choose a course</option>
            {courses.data?.map(c => <option key={c.id} value={c.id}>{c.name}{c.cohort ? ` — ${c.cohort.name}` : ''}</option>)}
          </Select>
          <Input label="Title" value={meta.title} placeholder={defaultTitle || 'Knowledge Check — Course name'} onChange={e => setMeta({ ...meta, title: e.target.value })}
            hint={!meta.title && defaultTitle ? 'Leave blank to use the placeholder title' : undefined} wrapperClassName="sm:col-span-2" />
          <Textarea label="Instructions (optional)" rows={2} value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} wrapperClassName="sm:col-span-2" />
          <Input label="Opens (optional)" type="datetime-local" value={meta.opensAt} onChange={e => setMeta({ ...meta, opensAt: e.target.value })} hint="Blank = immediately" />
          <Input label="Closes (optional)" type="datetime-local" value={meta.closesAt} onChange={e => setMeta({ ...meta, closesAt: e.target.value })} hint="Blank = never" />
        </div>
      </Card>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={i}>
            <div className="mb-3 flex items-center justify-between">
              <Badge tone="brand">Question {i + 1}</Badge>
              <div className="flex">
                <IconButton icon={Copy} label={`Duplicate question ${i + 1}`} disabled={questions.length >= MAX_QUESTIONS}
                  onClick={() => setQuestions(qs => [...qs.slice(0, i + 1), { ...q, options: [...q.options] }, ...qs.slice(i + 1)])} />
                <IconButton icon={Trash2} label={`Delete question ${i + 1}`} tone="danger" disabled={questions.length === 1}
                  onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} />
              </div>
            </div>
            <Textarea aria-label={`Question ${i + 1} text`} rows={2} placeholder="What does a smart contract run on?" value={q.q} onChange={e => updateQ(i, { q: e.target.value })} className="min-h-0" />
            <div className="mt-3 space-y-2">
              {q.options.map((opt, j) => {
                const correct = q.answer === j;
                return (
                  <div key={j} className={cx('flex items-center gap-2 rounded-xl border pl-2 pr-1 transition-colors', correct ? 'border-success/50 bg-success/5' : 'border-line bg-ink/40')}>
                    <button type="button" aria-pressed={correct} aria-label={`Mark option ${LETTERS[j]} correct`} onClick={() => updateQ(i, { answer: j })}
                      className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                        correct ? 'bg-success text-black' : 'bg-surface-2 text-muted hover:text-white')}>
                      {LETTERS[j]}
                    </button>
                    <input aria-label={`Question ${i + 1} option ${LETTERS[j]}`} placeholder={`Option ${LETTERS[j]}`} value={opt}
                      onChange={e => updateQ(i, { options: q.options.map((o, k) => (k === j ? e.target.value : o)) })}
                      className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-faint" />
                    <IconButton icon={X} label={`Remove option ${LETTERS[j]}`} disabled={q.options.length <= 2}
                      onClick={() => updateQ(i, {
                        options: q.options.filter((_, k) => k !== j),
                        answer: q.answer === j ? null : q.answer !== null && q.answer > j ? q.answer - 1 : q.answer,
                      })} />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Button variant="ghost" size="sm" icon={Plus} disabled={q.options.length >= MAX_OPTIONS} onClick={() => updateQ(i, { options: [...q.options, ''] })}>Add option</Button>
              {q.answer === null && <span className="text-xs text-faint">Tap a letter to mark the correct answer</span>}
            </div>
          </Card>
        ))}
        <Button variant="secondary" icon={Plus} className="w-full" disabled={questions.length >= MAX_QUESTIONS} onClick={() => setQuestions(qs => [...qs, blank()])}>
          Add question
        </Button>
      </div>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/90 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <p className="flex-1 text-sm text-muted">{ready}/{questions.length} questions ready</p>
          {error && <p className="w-full text-sm text-danger sm:order-first" role="alert">{error}</p>}
          <Button variant="secondary" loading={saving === 'DRAFT'} disabled={!!saving} onClick={() => save('DRAFT')}>Save draft</Button>
          <Button icon={Send} loading={saving === 'PUBLISHED'} disabled={!!saving} onClick={() => save('PUBLISHED')}>Publish</Button>
        </div>
      </div>
    </div>
  );
}

export default function NewTestPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Builder />
    </Suspense>
  );
}
