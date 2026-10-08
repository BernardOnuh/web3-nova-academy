// app/student/assignments/page.tsx — open weekly assignments (GET /student/assignments)
"use client";

import { useState } from 'react';
import { CheckCircle2, CheckSquare, ChevronDown, Clock, FileText, UploadCloud } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDateTime } from '@/lib/format';
import { useFeedback } from '@/components/feedback';
import { Alert, Badge, Button, Card, DataState, EmptyState, FileInput, Input, PageHeader, Spinner, cx } from '@/components/ui';

interface Assignment {
  id: string;
  title: string;
  description: string;
  openAt: string;
  closeAt: string;
}

interface AssignmentDetail extends Assignment {
  questionText: string | null;
  questionDocUrl: string | null;
  allowedSubmissionTypes: string;
  submission: { id: string; submissionType: string; cloudinaryUrl: string | null; contentUrl: string | null; submittedAt: string; updatedAt: string } | null;
}

const TYPE_LABEL: Record<string, string> = {
  pdf: 'PDF', doc: 'Document', url: 'Link', image: 'Image', video: 'Video', code: 'Code file',
};
const TYPE_ACCEPT: Record<string, string> = {
  pdf: 'application/pdf', doc: '.doc,.docx,.odt,.txt', image: 'image/*', video: 'video/*',
};

function parseTypes(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length ? v : ['pdf'];
  } catch {
    return ['pdf'];
  }
}

function AssignmentPanel({ id }: { id: string }) {
  const { toast } = useFeedback();
  const detail = useApi<AssignmentDetail>(`/student/assignments/${id}`);
  const types = detail.data ? parseTypes(detail.data.allowedSubmissionTypes) : [];
  const [type, setType] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = type ?? types[0];

  const submit = async () => {
    setError(null);
    const fd = new FormData();
    fd.append('submissionType', active);
    if (active === 'url') {
      if (!/^https?:\/\//.test(url)) return setError('Enter a full link starting with http:// or https://');
      fd.append('contentUrl', url);
    } else {
      if (!file) return setError('Choose a file to upload.');
      fd.append('file', file);
    }
    setSaving(true);
    try {
      await api(`/student/assignments/${id}/submit`, { form: fd });
      toast(detail.data?.submission ? 'Submission updated' : 'Assignment submitted');
      setFile(null);
      setUrl('');
      detail.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (detail.loading) return <div className="flex justify-center py-6"><Spinner /></div>;
  if (detail.error || !detail.data) return <Alert>{detail.error ?? 'Could not load this assignment.'}</Alert>;
  const d = detail.data;
  const sub = d.submission;
  const link = sub?.cloudinaryUrl ?? sub?.contentUrl;

  return (
    <div className="space-y-5">
      {(d.questionText || d.questionDocUrl) && (
        <div className="rounded-xl border border-line bg-ink/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">Brief</p>
          {d.questionText && <p className="whitespace-pre-line text-sm text-gray-200">{d.questionText}</p>}
          {d.questionDocUrl && (
            <a href={d.questionDocUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-soft hover:text-white">
              <FileText size={14} /> Open question document
            </a>
          )}
        </div>
      )}

      {sub && (
        <Alert tone="success">
          Submitted {formatDateTime(sub.updatedAt ?? sub.submittedAt)} as {TYPE_LABEL[sub.submissionType] ?? sub.submissionType}.
          {link && <> <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">View</a>.</>}
          {' '}You can replace it until the deadline.
        </Alert>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-gray-200">Submit as</p>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {types.map(t => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active === t}
              onClick={() => { setType(t); setFile(null); setError(null); }}
              className={cx('rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                active === t ? 'border-brand bg-brand/15 text-white' : 'border-line text-muted hover:text-white')}
            >
              {TYPE_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {active === 'url' ? (
          <Input label="Link" type="url" placeholder="https://github.com/you/project" value={url} onChange={e => setUrl(e.target.value)} wrapperClassName="flex-1" />
        ) : (
          <FileInput
            label="File"
            accept={TYPE_ACCEPT[active]}
            file={file}
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            hint={active === 'video' ? 'Up to 50MB' : 'Up to 20MB'}
            wrapperClassName="flex-1"
          />
        )}
        <Button icon={UploadCloud} loading={saving} onClick={submit} className="sm:mb-6">
          {sub ? 'Replace submission' : 'Submit'}
        </Button>
      </div>
      {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}
    </div>
  );
}

export default function StudentAssignmentsPage() {
  const assignments = useApi<Assignment[]>('/student/assignments');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = Array.isArray(assignments.data) ? assignments.data : [];

  return (
    <>
      <PageHeader title="Assignments" description="Weekly assignments open on Friday and close Monday night." />

      <DataState loading={assignments.loading} error={assignments.error} onRetry={assignments.reload}>
        {list.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon={CheckSquare} title="No open assignments" description="This week's assignment will appear here when it opens." />
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map(a => {
              const open = openId === a.id;
              return (
                <Card key={a.id}>
                  <button className="flex w-full items-start gap-4 text-left" onClick={() => setOpenId(open ? null : a.id)} aria-expanded={open}>
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-soft"><CheckSquare size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{a.title}</p>
                      <p className={cx('mt-1 text-sm text-muted', !open && 'line-clamp-2')}>{a.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="warning"><Clock size={11} /> Closes {formatDateTime(a.closeAt)}</Badge>
                      </div>
                    </div>
                    <ChevronDown size={18} className={cx('mt-1 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <div className="mt-5 border-t border-line pt-5">
                      <AssignmentPanel id={a.id} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </DataState>

      <p className="mt-6 flex items-center gap-2 text-xs text-faint">
        <CheckCircle2 size={14} /> Grades and feedback appear on the Grades page once your tutor marks your work.
      </p>
    </>
  );
}
