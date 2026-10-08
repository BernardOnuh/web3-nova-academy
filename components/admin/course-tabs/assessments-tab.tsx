// components/admin/course-tabs/assessments-tab.tsx — V1 assessments: create, MCQ questions, paper upload, results
"use client";

import { useState } from 'react';
import { ClipboardCheck, ExternalLink, FileQuestion, FileText, FileUp, ListChecks, Plus, Trash2, UploadCloud } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDateTime, isPast } from '@/lib/format';
import { useFeedback } from '../../feedback';
import {
  Alert, Avatar, Badge, Button, Card, DataState, EmptyState, FileInput, IconButton, Input, Modal, Select, Spinner, Tabs, cx,
} from '../../ui';

interface Assessment {
  id: string; title: string; type: string; dueDate: string; questions: string; correctAnswers: string; courseId: string;
}
interface Result {
  id: string; answers: string; submissionType: string; cloudinaryUrl: string | null; contentUrl: string | null;
  score: number | null; submittedAt: string; student: { name: string; email: string };
}
interface DraftQ { q: string; options: [string, string, string, string]; correct: string }

const LETTERS = ['A', 'B', 'C', 'D'];
const emptyQ = (): DraftQ => ({ q: '', options: ['', '', '', ''], correct: '' });

function describe(a: Assessment): { mode: 'mcq' | 'paper' | 'empty'; count: number; paperUrl?: string } {
  try {
    const p = JSON.parse(a.questions || '[]');
    if (p && !Array.isArray(p) && p.paperUrl) return { mode: 'paper', count: 0, paperUrl: p.paperUrl };
    if (Array.isArray(p) && p.length) return { mode: 'mcq', count: p.length };
  } catch { /* malformed */ }
  return { mode: 'empty', count: 0 };
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** questions → CSV in the format /admin/assessments/:id/upload-questions parses (answers stay server-side) */
function toCSV(qs: DraftQ[]) {
  const rows = qs.map(q => [q.q, ...q.options, q.correct].map(csvCell).join(','));
  return ['question,option_a,option_b,option_c,option_d,correct', ...rows].join('\n');
}

/** existing MCQ questions (+ server-side answers) as editable drafts */
function draftsFrom(a: Assessment): DraftQ[] {
  try {
    const existing = JSON.parse(a.questions || '[]');
    const answers: string[] = JSON.parse(a.correctAnswers || '[]');
    if (Array.isArray(existing) && existing.length) {
      return existing.map((q: { q: string; options: string[] }, i: number) => ({
        q: q.q,
        options: [0, 1, 2, 3].map(j => q.options[j] ?? '') as DraftQ['options'],
        correct: answers[i] ?? '',
      }));
    }
  } catch { /* start fresh */ }
  return [emptyQ()];
}

type QuestionsProps = { assessment: Assessment | null; onClose: () => void; onSaved: () => void };

function QuestionsModal(props: QuestionsProps) {
  return props.assessment ? <QuestionsEditor {...props} assessment={props.assessment} /> : null;
}

function QuestionsEditor({ assessment, onClose, onSaved }: QuestionsProps & { assessment: Assessment }) {
  const { toast } = useFeedback();
  const [tab, setTab] = useState<'build' | 'import'>('build');
  const [qs, setQs] = useState<DraftQ[]>(() => draftsFrom(assessment));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<DraftQ>) => setQs(list => list.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const upload = async (f: File) => {
    if (!assessment) return;
    const fd = new FormData();
    fd.append('file', f);
    const res = await api<{ message: string }>(`/admin/assessments/${assessment.id}/upload-questions`, { form: fd });
    toast(res.message);
    onSaved();
    onClose();
  };

  const save = async () => {
    setError(null);
    if (tab === 'import') {
      if (!file) return setError('Choose a .csv, .pdf or .docx file.');
    } else {
      const bad = qs.findIndex(q => !q.q.trim() || q.options.some(o => !o.trim()) || !q.correct);
      if (bad >= 0) return setError(`Question ${bad + 1}: fill in the question, all four options and pick the correct answer.`);
    }
    setSaving(true);
    try {
      await upload(tab === 'import' ? file! : new File([toCSV(qs)], 'questions.csv', { type: 'text/csv' }));
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
      title={`Questions · ${assessment.title}`}
      description="Correct answers stay on the server and are used to mark submissions automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{tab === 'import' ? 'Import questions' : `Save ${qs.length} question${qs.length === 1 ? '' : 's'}`}</Button>
        </>
      }
    >
      <Tabs className="-mt-2 mb-5" value={tab} onChange={setTab}
        tabs={[{ id: 'build', label: 'Build', icon: ListChecks }, { id: 'import', label: 'Import file', icon: FileUp }]} />
      {error && <Alert className="mb-4">{error}</Alert>}

      {tab === 'import' ? (
        <div className="space-y-3">
          <FileInput label="Question file" accept=".csv,.pdf,.docx" file={file} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-faint">
            CSV columns: <code className="text-muted">question, option_a, option_b, option_c, option_d, correct</code> (correct = A–D).
            PDF/DOCX are parsed from numbered questions with A–D options.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {qs.map((q, i) => (
            <div key={i} className="rounded-xl border border-line bg-ink/40 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-3 text-sm font-bold text-brand-soft">Q{i + 1}</span>
                <Input aria-label={`Question ${i + 1}`} placeholder="Question text…" value={q.q} onChange={e => update(i, { q: e.target.value })} wrapperClassName="flex-1" />
                <IconButton icon={Trash2} label={`Remove question ${i + 1}`} tone="danger" className="mt-1.5" disabled={qs.length === 1}
                  onClick={() => setQs(list => list.filter((_, j) => j !== i))} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:pl-8">
                {q.options.map((opt, j) => {
                  const letter = LETTERS[j];
                  const correct = q.correct === letter;
                  return (
                    <div key={j} className={cx('flex items-center gap-2 rounded-xl border px-2 transition-colors', correct ? 'border-success/50 bg-success/5' : 'border-line')}>
                      <button type="button" aria-label={`Mark ${letter} correct`} aria-pressed={correct} onClick={() => update(i, { correct: letter })}
                        className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                          correct ? 'bg-success text-black' : 'bg-surface-2 text-muted hover:text-white')}>
                        {letter}
                      </button>
                      <input aria-label={`Question ${i + 1} option ${letter}`} placeholder={`Option ${letter}`} value={opt}
                        onChange={e => update(i, { options: q.options.map((o, k) => (k === j ? e.target.value : o)) as DraftQ['options'] })}
                        className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-faint" />
                    </div>
                  );
                })}
              </div>
              {!q.correct && <p className="mt-2 text-xs text-faint sm:pl-8">Click a letter to mark the correct answer.</p>}
            </div>
          ))}
          <Button variant="secondary" icon={Plus} onClick={() => setQs(list => [...list, emptyQ()])}>Add question</Button>
        </div>
      )}
    </Modal>
  );
}

function ResultsModal({ assessment, onClose }: { assessment: Assessment | null; onClose: () => void }) {
  const { toast } = useFeedback();
  const results = useApi<Result[]>(assessment ? `/admin/assessments/${assessment.id}/results` : null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (r: Result) => {
    const score = Number(draft[r.id]);
    if (!Number.isFinite(score) || score < 0 || score > 100) return toast('Score must be 0–100', 'error');
    setSaving(r.id);
    try {
      await api(`/admin/assessments/results/${r.id}/score`, { method: 'PATCH', body: { score: Math.round(score) } });
      results.setData(prev => (prev ?? []).map(x => (x.id === r.id ? { ...x, score: Math.round(score) } : x)));
      toast(`Scored ${r.student.name}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal open={!!assessment} onClose={onClose} size="lg" title={`Results · ${assessment?.title ?? ''}`}>
      {results.loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : results.error ? (
        <Alert>{results.error}</Alert>
      ) : !results.data?.length ? (
        <EmptyState icon={ClipboardCheck} title="No submissions yet" className="py-8" />
      ) : (
        <ul className="divide-y divide-line">
          {results.data.map(r => {
            const link = r.cloudinaryUrl ?? r.contentUrl;
            return (
              <li key={r.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={r.student.name} size={34} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{r.student.name}</p>
                    <p className="text-xs text-faint">{formatDateTime(r.submittedAt)}</p>
                  </div>
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-soft hover:text-white">
                      <ExternalLink size={12} /> Answer
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.score != null && <Badge tone={r.score >= 50 ? 'success' : 'danger'} className="tabular-nums">{r.score}%</Badge>}
                  <Input aria-label="Score" type="number" min={0} max={100} placeholder="%" wrapperClassName="w-20" className="h-9"
                    value={draft[r.id] ?? ''} onChange={e => setDraft(d => ({ ...d, [r.id]: e.target.value }))} />
                  <Button size="sm" variant="secondary" loading={saving === r.id} disabled={!draft[r.id]} onClick={() => save(r)}>
                    {r.score != null ? 'Override' : 'Score'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export default function AssessmentsTab({ courseId, cohortId }: { courseId: string; cohortId: string }) {
  const { toast } = useFeedback();
  const list = useApi<Assessment[]>(`/admin/assessments?courseId=${courseId}`);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'TEST', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionsFor, setQuestionsFor] = useState<Assessment | null>(null);
  const [resultsFor, setResultsFor] = useState<Assessment | null>(null);
  const [paperFor, setPaperFor] = useState<Assessment | null>(null);
  const [paper, setPaper] = useState<File | null>(null);
  const [uploadingPaper, setUploadingPaper] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const a = await api<Assessment>('/admin/assessments', {
        body: { ...form, dueDate: new Date(form.dueDate).toISOString(), courseId, cohortId },
      });
      list.setData(prev => [a, ...(prev ?? [])]);
      setCreating(false);
      setForm({ title: '', type: 'TEST', dueDate: '' });
      toast('Assessment created — now add questions or a paper');
      setQuestionsFor(a);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const uploadPaper = async () => {
    if (!paperFor || !paper) return;
    setUploadingPaper(true);
    try {
      const fd = new FormData();
      fd.append('file', paper);
      const updated = await api<Assessment>(`/admin/assessments/${paperFor.id}/paper`, { form: fd });
      list.setData(prev => (prev ?? []).map(x => (x.id === updated.id ? updated : x)));
      toast('Question paper uploaded');
      setPaperFor(null);
      setPaper(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setUploadingPaper(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Tests and exams. MCQ ones are marked automatically; paper ones you score by hand.</p>
        <Button icon={Plus} onClick={() => setCreating(true)}>New assessment</Button>
      </div>

      <DataState loading={list.loading} error={list.error} onRetry={list.reload}>
        {!list.data?.length ? (
          <Card padded={false}>
            <EmptyState icon={FileText} title="No assessments yet" action={<Button icon={Plus} onClick={() => setCreating(true)}>Create one</Button>} />
          </Card>
        ) : (
          <div className="space-y-3">
            {list.data.map(a => {
              const d = describe(a);
              return (
                <Card key={a.id} className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><FileText size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{a.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge className="uppercase">{a.type}</Badge>
                      {d.mode === 'mcq' && <Badge tone="brand">MCQ · {d.count} questions</Badge>}
                      {d.mode === 'paper' && <Badge tone="gold">Question paper</Badge>}
                      {d.mode === 'empty' && <Badge tone="warning">No questions yet</Badge>}
                      <span className={cx('text-xs', isPast(a.dueDate) ? 'text-danger' : 'text-faint')}>Due {formatDateTime(a.dueDate)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" icon={FileQuestion} onClick={() => setQuestionsFor(a)}>{d.mode === 'mcq' ? 'Edit questions' : 'MCQ questions'}</Button>
                    <Button size="sm" variant="ghost" icon={UploadCloud} onClick={() => { setPaperFor(a); setPaper(null); }}>{d.mode === 'paper' ? 'Replace paper' : 'Paper'}</Button>
                    <Button size="sm" variant="secondary" icon={ClipboardCheck} onClick={() => setResultsFor(a)}>Results</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </DataState>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New assessment"
        footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" form="assessment-form" loading={saving}>Create</Button></>}
      >
        <form id="assessment-form" onSubmit={create} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Input label="Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Midterm quiz" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="TEST">Test</option>
              <option value="EXAM">Exam</option>
              <option value="QUIZ">Quiz</option>
            </Select>
            <Input label="Due" type="datetime-local" required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!paperFor}
        onClose={() => setPaperFor(null)}
        title="Upload question paper"
        description="Students download it and upload their answers as a file. Replaces any MCQ questions."
        footer={<><Button variant="secondary" onClick={() => setPaperFor(null)}>Cancel</Button><Button icon={UploadCloud} loading={uploadingPaper} disabled={!paper} onClick={uploadPaper}>Upload</Button></>}
      >
        {paperFor && describe(paperFor).paperUrl && (
          <a href={describe(paperFor).paperUrl} target="_blank" rel="noopener noreferrer" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-soft hover:text-white">
            <ExternalLink size={14} /> Current paper
          </a>
        )}
        <FileInput label="Paper (PDF / DOC)" accept=".pdf,.doc,.docx" file={paper} onChange={e => setPaper(e.target.files?.[0] ?? null)} />
      </Modal>

      <QuestionsModal assessment={questionsFor} onClose={() => setQuestionsFor(null)} onSaved={list.reload} />
      <ResultsModal assessment={resultsFor} onClose={() => setResultsFor(null)} />
    </>
  );
}
