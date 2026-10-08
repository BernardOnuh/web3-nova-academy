// app/student/assessments/[id]/page.tsx — take an assessment (MCQ or file upload)
"use client";

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, UploadCloud } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useFeedback } from '@/components/feedback';
import { Alert, Badge, Button, ButtonLink, Card, DataState, EmptyState, FileInput, PageHeader, cx } from '@/components/ui';

interface MCQQuestion { q: string; options: string[] }
interface Assessment { id: string; title: string; type?: string; description?: string; questions: string | null }

const LETTERS = 'ABCDEFGHIJ';

type Parsed = { mode: 'mcq'; questions: MCQQuestion[] } | { mode: 'file_upload'; paperUrl: string | null };

function parse(raw: string | null | undefined): Parsed {
  try {
    const p = JSON.parse(raw || '');
    if (p && typeof p === 'object' && 'paperUrl' in p) return { mode: 'file_upload', paperUrl: p.paperUrl ?? null };
    if (Array.isArray(p)) return { mode: 'mcq', questions: p };
  } catch {
    /* empty or malformed */
  }
  return { mode: 'mcq', questions: [] };
}

export default function TakeAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const { confirm } = useFeedback();
  const assessment = useApi<Assessment>(`/student/assessments/${id}`);
  const parsed = useMemo(() => parse(assessment.data?.questions), [assessment.data]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submitMCQ = async () => {
    if (parsed.mode !== 'mcq') return;
    if (Object.keys(answers).length < parsed.questions.length) return setError('Please answer every question before submitting.');
    if (!(await confirm({ title: 'Submit your answers?', description: "You can't change them after submitting.", confirmLabel: 'Submit' }))) return;
    setError('');
    setSubmitting(true);
    try {
      await api(`/student/assessments/${id}/submit`, { body: { answers } });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitFile = async () => {
    if (!file) return setError('Please choose your answer file.');
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api(`/student/assessments/${id}/submit-file`, { form: fd });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center py-14 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-success/15 text-success"><CheckCircle2 size={36} /></span>
        <h1 className="mt-5 text-2xl font-bold text-white">Submitted!</h1>
        <p className="mt-2 text-muted">Your {parsed.mode === 'mcq' ? 'answers have' : 'answer file has'} been recorded. Results appear in Grades once marked.</p>
        <div className="mt-6 flex gap-2">
          <ButtonLink href="/student/assessments" variant="secondary">Back to assessments</ButtonLink>
          <ButtonLink href="/student/grades">View grades</ButtonLink>
        </div>
      </Card>
    );
  }

  const a = assessment.data;

  return (
    <div className="mx-auto max-w-3xl">
      <DataState loading={assessment.loading} error={assessment.error} onRetry={assessment.reload}>
        {a && (
          <>
            <PageHeader
              back={{ href: '/student/assessments', label: 'Assessments' }}
              eyebrow={a.type}
              title={a.title}
              description={
                parsed.mode === 'mcq'
                  ? `${parsed.questions.length} question${parsed.questions.length === 1 ? '' : 's'} — answer all before submitting.`
                  : 'Download the question paper, complete it, then upload your answer.'
              }
              actions={<Badge tone={parsed.mode === 'mcq' ? 'brand' : 'gold'}>{parsed.mode === 'mcq' ? 'Multiple choice' : 'File upload'}</Badge>}
            />
            {a.description && <p className="-mt-4 mb-6 whitespace-pre-line text-sm text-muted">{a.description}</p>}

            {parsed.mode === 'mcq' ? (
              parsed.questions.length === 0 ? (
                <Card padded={false}><EmptyState icon={CheckCircle2} title="No questions yet" description="Your tutor hasn't added questions to this assessment." /></Card>
              ) : (
                <div className="space-y-4">
                  {parsed.questions.map((q, i) => (
                    <Card key={i}>
                      <fieldset>
                        <legend className="mb-4 font-semibold text-white"><span className="mr-2 text-brand-soft">Q{i + 1}.</span>{q.q}</legend>
                        <div className="space-y-2">
                          {q.options.map((opt, j) => {
                            // the API scores answers by option letter (A, B, C…)
                            const letter = LETTERS[j];
                            const selected = answers[String(i)] === letter;
                            return (
                              <label key={j} className={cx(
                                'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
                                selected ? 'border-brand/60 bg-brand/10 text-white' : 'border-line bg-ink/40 text-gray-300 hover:border-line-strong',
                              )}>
                                <input type="radio" name={`q${i}`} checked={selected} onChange={() => setAnswers(p => ({ ...p, [String(i)]: letter }))} className="accent-brand" />
                                <span className="font-semibold text-faint">{letter}.</span> {opt}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </Card>
                  ))}
                  {error && <Alert>{error}</Alert>}
                  <Button size="lg" className="w-full" loading={submitting} onClick={submitMCQ}>Submit answers</Button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <Card>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold">Step 1 · Question paper</p>
                  {parsed.paperUrl ? (
                    <a href={parsed.paperUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/15">
                      <ExternalLink size={16} /> Open question paper
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-muted">The question paper hasn&apos;t been uploaded yet. Check back later.</p>
                  )}
                </Card>
                <Card>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold">Step 2 · Upload your answer</p>
                  <FileInput file={file} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </Card>
                {error && <Alert>{error}</Alert>}
                <Button size="lg" className="w-full" icon={UploadCloud} loading={submitting} disabled={!file || !parsed.paperUrl} onClick={submitFile}>
                  Submit answer file
                </Button>
              </div>
            )}
          </>
        )}
      </DataState>
    </div>
  );
}
