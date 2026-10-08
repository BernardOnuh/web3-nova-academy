// app/student/attendance/page.tsx
"use client";

import { useState } from 'react';
import { CheckCircle2, Clock, Wifi } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, plural } from '@/lib/format';
import { useFeedback } from '@/components/feedback';
import { Alert, Badge, Button, Card, DataState, EmptyState, PageHeader, Table, Td, Tr } from '@/components/ui';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  session?: { date: string; active: boolean };
}

// messages from PAGES.md §4.3
const CHECK_IN_ERRORS: Record<number, string> = {
  403: 'You must be connected to the class network to check in.',
  404: 'No class is currently in session.',
  409: "You've already checked in for this session.",
};

export default function StudentAttendancePage() {
  const { toast } = useFeedback();
  const records = useApi<AttendanceRecord[]>('/student/attendance');
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setMessage(null);
    try {
      await api('/student/attendance/check-in', { method: 'POST' });
      toast('Checked in successfully');
      setMessage({ text: 'Checked in successfully.', ok: true });
      records.reload();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setMessage({ text: CHECK_IN_ERRORS[status] ?? (err as Error).message, ok: false });
    } finally {
      setCheckingIn(false);
    }
  };

  const list = Array.isArray(records.data) ? records.data : [];

  return (
    <>
      <PageHeader
        title="Attendance"
        description={records.loading ? 'Your class check-ins.' : `${plural(list.length, 'session')} attended.`}
        actions={<Button size="lg" icon={Wifi} loading={checkingIn} onClick={handleCheckIn}>Check in now</Button>}
      />

      {message && (
        <Alert tone={message.ok ? 'success' : 'error'} className="mb-6" onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <DataState loading={records.loading} error={records.error} onRetry={records.reload}>
        <Card padded={false} className="overflow-hidden">
          {list.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No attendance records yet"
              description="Use “Check in now” when class is in session. You must be on the class network."
            />
          ) : (
            <Table head={['Date', 'Status']}>
              {list.map(rec => (
                <Tr key={rec.id}>
                  <Td className="text-white">{formatDate(rec.date ?? rec.session?.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Td>
                  <Td>
                    <Badge tone="success"><CheckCircle2 size={12} /> Present</Badge>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      </DataState>
    </>
  );
}
