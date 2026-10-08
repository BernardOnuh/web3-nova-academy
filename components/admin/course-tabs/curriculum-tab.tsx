// components/admin/course-tabs/curriculum-tab.tsx — weekly curriculum + one assignment per week + grading
"use client";

import { useState } from 'react';
import { CalendarRange, CheckSquare, ChevronDown, ExternalLink, Pencil, Plus, Sparkles, Users } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDateTime, isPast } from '@/lib/format';
import { useFeedback } from '../../feedback';
import {
  Alert, Avatar, Badge, Button, Card, DataState, EmptyState, FileInput, IconButton, Input, Modal, Spinner, Textarea, cx,
} from '../../ui';

interface Assignment { id: string; title: string; description: string; questionText: string | null; questionDocUrl: string | null; allowedSubmissionTypes: string; openAt: string; closeAt: string }
interface Week { id: string; week: number; title: string; description: string | null; assignment: Assignment | null; materials: unknown[] }
interface Submission {
  id: string; submissionType: string; cloudinaryUrl: string | null; contentUrl: string | null; submittedAt: string;
  grade: number | null; feedback: string | null; student: { name: string; email: string };
}

const SUBMISSION_TYPES = ['pdf', 'doc', 'url', 'image', 'video', 'code'];

function windowBadge(a: Assignment) {
  if (isPast(a.closeAt)) return <Badge>Closed</Badge>;
  if (isPast(a.openAt)) return <Badge tone="success">Open until {formatDateTime(a.closeAt)}</Badge>;
  return <Badge tone="brand">Opens {formatDateTime(a.openAt)}</Badge>;
}

function Submissions({ assignmentId }: { assignmentId: string }) {
  const { toast } = useFeedback();
  const subs = useApi<Submission[]>(`/admin/assignments/${assignmentId}/submissions`);
  const [draft, setDraft] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const value = (s: Submission) => draft[s.id] ?? { grade: s.grade != null ? String(s.grade) : '', feedback: s.feedback ?? '' };

  const save = async (s: Submission) => {
    const v = value(s);
    const grade = Number(v.grade);
    if (!Number.isFinite(grade) || grade < 0 || grade > 100) return toast('Grade must be between 0 and 100', 'error');
    setSaving(s.id);
    try {
      await api(`/admin/submissions/${s.id}/grade`, { method: 'PATCH', body: { grade: Math.round(grade), feedback: v.feedback } });
      subs.setData(prev => (prev ?? []).map(x => (x.id === s.id ? { ...x, grade: Math.round(grade), feedback: v.feedback } : x)));
      toast(`Graded ${s.student.name}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(null);
    }
  };

  if (subs.loading) return <div className="flex justify-center py-6"><Spinner /></div>;
  if (subs.error) return <Alert>{subs.error}</Alert>;
  if (!subs.data?.length) return <p className="py-4 text-center text-sm text-muted">No submissions yet.</p>;

  return (
    <ul className="divide-y divide-line">
      {subs.data.map(s => {
        const v = value(s);
        const link = s.cloudinaryUrl ?? s.contentUrl;
        return (
          <li key={s.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-end">
            <div className="flex min-w-0 items-center gap-3 lg:w-64">
              <Avatar name={s.student.name} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{s.student.name}</p>
                <p className="text-xs text-faint">{formatDateTime(s.submittedAt)} · {s.submissionType}</p>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-soft hover:text-white">
                    <ExternalLink size={12} /> Open
                  </a>
                )}
              </div>
            </div>
            <Input label="Grade %" type="number" min={0} max={100} value={v.grade} wrapperClassName="w-24"
              onChange={e => setDraft(d => ({ ...d, [s.id]: { ...v, grade: e.target.value } }))} />
            <Input label="Feedback" value={v.feedback} wrapperClassName="flex-1" placeholder="Optional comment…"
              onChange={e => setDraft(d => ({ ...d, [s.id]: { ...v, feedback: e.target.value } }))} />
            <Button variant={s.grade != null ? 'secondary' : 'primary'} className="h-11" loading={saving === s.id} disabled={!v.grade} onClick={() => save(s)}>
              {s.grade != null ? 'Update' : 'Save grade'}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function parseTypes(a: Assignment | null | undefined) {
  try { return a ? (JSON.parse(a.allowedSubmissionTypes) as string[]) : SUBMISSION_TYPES; } catch { return SUBMISSION_TYPES; }
}

type WeekModalProps<T> = { week: Week | null; onClose: () => void; onSaved: T };

// both modals mount their form only while open, so it always starts from the current week
function AssignmentModal(props: WeekModalProps<() => void>) {
  return props.week ? <AssignmentForm {...props} week={props.week} /> : null;
}

function AssignmentForm({ week, onClose, onSaved }: WeekModalProps<() => void> & { week: Week }) {
  const { toast } = useFeedback();
  const existing = week.assignment;
  const [form, setForm] = useState(() => ({ title: existing?.title ?? '', description: existing?.description ?? '', questionText: existing?.questionText ?? '' }));
  const [types, setTypes] = useState<string[]>(() => parseTypes(existing));
  const [doc, setDoc] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!types.length) return setError('Allow at least one submission type.');
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('questionText', form.questionText.trim());
    fd.append('allowedSubmissionTypes', JSON.stringify(types));
    if (doc) fd.append('questionDoc', doc);
    try {
      await api(existing ? `/admin/assignments/${existing.id}` : `/admin/curriculum/${week.id}/assignment`, {
        method: existing ? 'PATCH' : 'POST',
        form: fd,
      });
      toast(existing ? 'Assignment updated' : `Week ${week.week} assignment created`);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={existing ? 'Edit assignment' : `New assignment · Week ${week.week}`}
      description={existing ? undefined : 'Opens Friday of that week and closes Monday 23:59 — the window is set automatically.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="assignment-form" loading={saving}>{existing ? 'Save changes' : 'Create assignment'}</Button>
        </>
      }
    >
      <form id="assignment-form" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Input label="Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Build an ERC-20 token" />
        <Textarea label="Summary" required rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <Textarea label="Full brief (optional)" rows={4} value={form.questionText} onChange={e => setForm({ ...form, questionText: e.target.value })}
          hint="Leave blank to extract the text from an uploaded PDF/DOCX." />
        <FileInput label="Question document (optional)" accept=".pdf,.doc,.docx" file={doc} onChange={e => setDoc(e.target.files?.[0] ?? null)} />
        <div>
          <p className="mb-2 text-sm font-medium text-gray-200">Students may submit</p>
          <div className="flex flex-wrap gap-2">
            {SUBMISSION_TYPES.map(t => {
              const on = types.includes(t);
              return (
                <button key={t} type="button" aria-pressed={on}
                  onClick={() => setTypes(on ? types.filter(x => x !== t) : [...types, t])}
                  className={cx('rounded-lg border px-3 py-1.5 text-sm font-medium uppercase transition-colors',
                    on ? 'border-brand bg-brand/15 text-white' : 'border-line text-faint hover:text-white')}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function WeekModal(props: WeekModalProps<(w: Week) => void>) {
  return props.week ? <WeekForm {...props} week={props.week} /> : null;
}

function WeekForm({ week, onClose, onSaved }: WeekModalProps<(w: Week) => void> & { week: Week }) {
  const { toast } = useFeedback();
  const [title, setTitle] = useState(week.title);
  const [description, setDescription] = useState(week.description ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/admin/curriculum/${week.id}`, { method: 'PATCH', body: { title, description } });
      onSaved({ ...week, title, description });
      toast(`Week ${week.week} updated`);
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Week ${week.week}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="week-form" loading={saving}>Save</Button></>}>
      <form id="week-form" onSubmit={save} className="space-y-4">
        <Input label="Topic" required value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea label="Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </form>
    </Modal>
  );
}

export default function CurriculumTab({ courseId, cohortId, canSeed }: { courseId: string; cohortId: string; canSeed: boolean }) {
  const { toast } = useFeedback();
  const weeks = useApi<Week[]>(`/admin/curriculum?courseId=${courseId}&cohortId=${cohortId}`);
  const [seeding, setSeeding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [assignmentWeek, setAssignmentWeek] = useState<Week | null>(null);

  const seed = async () => {
    setSeeding(true);
    try {
      await api(`/admin/curriculum/seed/${cohortId}/${courseId}`, { method: 'POST' });
      toast('12 curriculum weeks created');
      weeks.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSeeding(false);
    }
  };

  const list = weeks.data ?? [];

  return (
    <>
      <DataState loading={weeks.loading} error={weeks.error} onRetry={weeks.reload}>
        {list.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={CalendarRange}
              title="No curriculum yet"
              description={canSeed ? 'Generate the 12-week outline, then name each week and attach its assignment.' : 'Ask a super admin to generate the 12-week outline for this course.'}
              action={canSeed && <Button icon={Sparkles} loading={seeding} onClick={seed}>Generate 12 weeks</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map(w => {
              const a = w.assignment;
              const open = openId === w.id;
              return (
                <Card key={w.id} padded={false}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                    <span className="inline-flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand/10 text-brand-soft">
                      <span className="text-[10px] font-semibold uppercase leading-none">Week</span>
                      <span className="text-base font-bold leading-tight">{w.week}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate font-semibold text-white">{w.title}</p>
                        <IconButton icon={Pencil} label={`Edit week ${w.week}`} onClick={() => setEditingWeek(w)} className="size-7" />
                      </div>
                      {w.description && <p className="text-sm text-muted line-clamp-1">{w.description}</p>}
                      {a && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                          <CheckSquare size={14} className="text-gold" />
                          <span className="text-gray-200">{a.title}</span>
                          {windowBadge(a)}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {a ? (
                        <>
                          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setAssignmentWeek(w)}>Edit</Button>
                          <Button variant="secondary" size="sm" icon={Users} onClick={() => setOpenId(open ? null : w.id)}>
                            Submissions <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} />
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" size="sm" icon={Plus} onClick={() => setAssignmentWeek(w)}>Add assignment</Button>
                      )}
                    </div>
                  </div>
                  {open && a && <div className="border-t border-line px-4 sm:px-5"><Submissions assignmentId={a.id} /></div>}
                </Card>
              );
            })}
          </div>
        )}
      </DataState>

      <WeekModal week={editingWeek} onClose={() => setEditingWeek(null)}
        onSaved={w => weeks.setData(prev => (prev ?? []).map(x => (x.id === w.id ? w : x)))} />
      <AssignmentModal week={assignmentWeek} onClose={() => setAssignmentWeek(null)} onSaved={weeks.reload} />
    </>
  );
}
