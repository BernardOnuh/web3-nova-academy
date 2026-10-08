// components/admin/course-tabs/attendance-tab.tsx — class sessions (one active per course) + who checked in
"use client";

import { useState } from 'react';
import { CalendarDays, ChevronDown, Clock, Plus, Users, Wifi } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, plural } from '@/lib/format';
import { useFeedback } from '../../feedback';
import { Alert, Avatar, Badge, Button, Card, DataState, EmptyState, Input, Modal, Spinner, cx } from '../../ui';

interface Session { id: string; date: string; allowedIp: string; active: boolean; courseId: string; _count?: { attendances: number } }
interface Record_ { id: string; date: string; ip: string; student: { name: string; email: string } }

function Attendees({ sessionId }: { sessionId: string }) {
  const records = useApi<Record_[]>(`/admin/attendance?sessionId=${sessionId}`);
  if (records.loading) return <div className="flex justify-center py-4"><Spinner /></div>;
  if (records.error) return <Alert>{records.error}</Alert>;
  if (!records.data?.length) return <p className="py-3 text-sm text-muted">Nobody has checked in yet.</p>;
  return (
    <ul className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2">
      {records.data.map(r => (
        <li key={r.id} className="flex items-center gap-2.5 text-sm">
          <Avatar name={r.student.name} size={28} />
          <span className="truncate text-gray-200">{r.student.name}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AttendanceTab({ courseId, cohortId }: { courseId: string; cohortId: string }) {
  const { toast, confirm } = useFeedback();
  const sessions = useApi<Session[]>(`/admin/attendance/sessions?cohortId=${cohortId}`);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), allowedIp: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = (sessions.data ?? []).filter(s => s.courseId === courseId);
  const active = list.find(s => s.active);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api('/admin/attendance/sessions', { body: { ...form, allowedIp: form.allowedIp.trim(), courseId, cohortId } });
      toast('Session started — students can check in now');
      setCreating(false);
      sessions.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const close = async (s: Session) => {
    if (!(await confirm({ title: 'Close this session?', description: 'Students will no longer be able to check in.', confirmLabel: 'Close session' }))) return;
    try {
      await api(`/admin/attendance/sessions/${s.id}/close`, { method: 'PATCH' });
      sessions.setData(prev => (prev ?? []).map(x => (x.id === s.id ? { ...x, active: false } : x)));
      toast('Session closed');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Students check in from the class network. Starting a session closes the previous one.</p>
        <Button icon={Plus} onClick={() => { setCreating(true); setError(null); }}>Start session</Button>
      </div>

      {active && (
        <Alert tone="success" className="mb-5">
          Session open for {formatDate(active.date)} · {plural(active._count?.attendances ?? 0, 'student')} checked in · network {active.allowedIp}
        </Alert>
      )}

      <DataState loading={sessions.loading} error={sessions.error} onRetry={sessions.reload}>
        {list.length === 0 ? (
          <Card padded={false}><EmptyState icon={Clock} title="No class sessions yet" description="Start a session at the beginning of class." /></Card>
        ) : (
          <div className="space-y-3">
            {list.map(s => {
              const open = openId === s.id;
              return (
                <Card key={s.id} padded={false}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                    <span className={cx('inline-flex size-10 shrink-0 items-center justify-center rounded-xl', s.active ? 'bg-success/15 text-success' : 'bg-white/[0.04] text-muted')}>
                      <CalendarDays size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{formatDate(s.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Open' : 'Closed'}</Badge>
                      </div>
                      <p className="text-sm text-muted">{plural(s._count?.attendances ?? 0, 'attendance')} · <Wifi size={12} className="inline" /> {s.allowedIp}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" icon={Users} onClick={() => setOpenId(open ? null : s.id)}>
                        Who came <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} />
                      </Button>
                      {s.active && <Button size="sm" variant="danger" onClick={() => close(s)}>Close</Button>}
                    </div>
                  </div>
                  {open && <div className="border-t border-line px-4 sm:px-5"><Attendees sessionId={s.id} /></div>}
                </Card>
              );
            })}
          </div>
        )}
      </DataState>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Start class session"
        footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" form="session-form" loading={saving}>Start session</Button></>}
      >
        <form id="session-form" onSubmit={start} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Input label="Date" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <Input label="Class network IP" required placeholder="e.g. 102.89.34.12" value={form.allowedIp} onChange={e => setForm({ ...form, allowedIp: e.target.value })}
            hint="The public IP of the classroom Wi-Fi. Only students on this network can check in." />
        </form>
      </Modal>
    </>
  );
}
