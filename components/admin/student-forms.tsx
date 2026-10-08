// components/admin/student-forms.tsx — enrol one student / bulk import (V1 admin endpoints)
"use client";

import { useMemo, useState } from 'react';
import { CheckCircle2, FileUp, Info, XCircle } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import type { Cohort, Course, Student } from '@/lib/types';
import { useFeedback } from '../feedback';
import { Alert, Button, FileInput, Input, Modal, Select, Textarea } from '../ui';

interface Common {
  open: boolean;
  onClose: () => void;
  cohorts: Cohort[];
  courses: Course[];
  /** pre-select (e.g. from a cohort page) */
  cohortId?: string;
  /** course admins can only enrol into their own course */
  lockCourseId?: string | null;
}

function useCohortCourse({ cohorts, courses, cohortId, lockCourseId }: Common) {
  const locked = lockCourseId ? courses.find(c => c.id === lockCourseId) : undefined;
  const [cohort, setCohort] = useState(() => cohortId ?? locked?.cohortId ?? (cohorts.length === 1 ? cohorts[0].id : ''));
  const [course, setCourse] = useState(lockCourseId ?? '');

  const options = courses.filter(c => c.cohortId === cohort);
  return { cohort, setCohort, course, setCourse, options, locked };
}

function CohortCourseFields(props: ReturnType<typeof useCohortCourse> & { cohorts: Cohort[] }) {
  const { cohort, setCohort, course, setCourse, options, locked, cohorts } = props;
  if (locked) return <Input label="Course" value={locked.name} disabled readOnly />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select label="Cohort" required value={cohort} onChange={e => { setCohort(e.target.value); setCourse(''); }}>
        <option value="">Choose cohort</option>
        {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Select label="Course" required disabled={!cohort} value={course} onChange={e => setCourse(e.target.value)}>
        <option value="">Choose course</option>
        {options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
    </div>
  );
}

// both modals mount their body only while open, so every opening starts with a clean form
export function AddStudentModal(props: Common & { onCreated: (s: Student) => void }) {
  return props.open ? <AddStudentForm {...props} /> : null;
}

function AddStudentForm(props: Common & { onCreated: (s: Student) => void }) {
  const { open, onClose, onCreated, cohorts } = props;
  const { toast } = useFeedback();
  const cc = useCohortCourse(props);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const student = await api<Student>('/admin/students', {
        body: { name: name.trim(), email: email.trim(), cohortId: cc.locked?.cohortId ?? cc.cohort, courseId: cc.course },
      });
      onCreated(student);
      toast(`${student.name} enrolled`);
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
      title="Enrol student"
      description="Their first password is their first name in lowercase."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="add-student" loading={saving}>Enrol student</Button>
        </>
      }
    >
      <form id="add-student" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Input label="Full name" required value={name} onChange={e => setName(e.target.value)} autoFocus />
        <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <CohortCourseFields {...cc} cohorts={cohorts} />
      </form>
    </Modal>
  );
}

interface Row { name: string; email: string }
interface BulkResult { created: { id: string; name: string; email: string }[]; failed: (Row & { reason: string })[] }

/** "Name, Email" per line; a header row is skipped */
function parseRows(text: string): Row[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines[0] && /name|email/i.test(lines[0]) && !lines[0].includes('@')) lines.shift();
  return lines.map(line => {
    const [name = '', email = ''] = line.split(/[,;\t]/).map(s => s.trim().replace(/^"|"$/g, ''));
    return { name, email };
  });
}

export function BulkStudentsModal(props: Common & { onDone: () => void }) {
  return props.open ? <BulkStudentsForm {...props} /> : null;
}

function BulkStudentsForm(props: Common & { onDone: () => void }) {
  const { open, onClose, onDone, cohorts } = props;
  const { toast } = useFeedback();
  const cc = useCohortCourse(props);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  const rows = useMemo(() => parseRows(text), [text]);
  const invalid = rows.filter(r => !r.name || !/^\S+@\S+$/.test(r.email)).length;

  const onFile = async (f: File | null) => {
    setFile(f);
    if (f) setText(await f.text());
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api<BulkResult>('/admin/students/bulk', {
        body: { students: rows, cohortId: cc.locked?.cohortId ?? cc.cohort, courseId: cc.course },
      });
      setResult(res);
      if (res.created.length) {
        toast(`${res.created.length} student${res.created.length === 1 ? '' : 's'} enrolled`);
        onDone();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const ready = rows.length > 0 && !!cc.course && (cc.locked || cc.cohort);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Bulk enrol students"
      description="Paste or upload a CSV with two columns: name, email."
      footer={
        result ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button icon={FileUp} loading={saving} disabled={!ready} onClick={submit}>
              Enrol {rows.length || ''} student{rows.length === 1 ? '' : 's'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <Alert tone={result.failed.length ? 'warning' : 'success'}>
            {result.created.length} enrolled · {result.failed.length} failed
          </Alert>
          {result.failed.length > 0 && (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {result.failed.map((f, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border border-line bg-ink/50 px-3 py-2 text-sm">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                  <div className="min-w-0">
                    <p className="text-white">{f.name || '(no name)'} <span className="text-faint">{f.email}</span></p>
                    <p className="text-xs text-danger/90">{/Unique constraint/i.test(f.reason) ? 'Email already registered' : f.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {result.created.length > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted"><CheckCircle2 size={16} className="text-success" /> Passwords default to each student&apos;s first name, lowercase.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <CohortCourseFields {...cc} cohorts={cohorts} />
          <FileInput label="CSV file" accept=".csv,text/csv,text/plain" file={file} onChange={e => onFile(e.target.files?.[0] ?? null)} />
          <Textarea
            label="…or paste rows"
            rows={6}
            value={text}
            onChange={e => { setText(e.target.value); setFile(null); }}
            placeholder={'Ada Obi, ada@example.com\nTunde Bello, tunde@example.com'}
            className="font-mono text-xs"
          />
          {rows.length > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Info size={14} /> {rows.length} row{rows.length === 1 ? '' : 's'} detected
              {invalid > 0 && <span className="text-warning">· {invalid} look incomplete and will likely fail</span>}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
