// app/admin/tests/page.tsx — Knowledge Checks (GET /v2/admin/tests)
"use client";

import { useMemo, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, formatDateTime, isPast } from '@/lib/format';
import type { AdminTest } from '@/lib/types';
import { Badge, ButtonLink, Card, DataState, EmptyState, PageHeader, Select, Table, Td, Tr } from '@/components/ui';

function status(t: AdminTest) {
  if (t.status === 'DRAFT') return <Badge>Draft</Badge>;
  if (t.opensAt && !isPast(t.opensAt)) return <Badge tone="brand">Opens {formatDateTime(t.opensAt)}</Badge>;
  if (t.closesAt && isPast(t.closesAt)) return <Badge>Closed</Badge>;
  return <Badge tone="success">Live</Badge>;
}

const questionCount = (t: AdminTest) => {
  try {
    const q = JSON.parse(t.questions);
    return Array.isArray(q) ? q.length : 0;
  } catch {
    return 0;
  }
};

export default function AdminTestsPage() {
  const tests = useApi<AdminTest[]>('/v2/tests/admin/tests');
  const [course, setCourse] = useState('');

  const courses = useMemo(() => {
    const m = new Map<string, string>();
    tests.data?.forEach(t => t.course && m.set(t.course.id, t.course.name));
    return [...m.entries()];
  }, [tests.data]);
  const list = (tests.data ?? []).filter(t => !course || t.courseId === course);

  return (
    <>
      <PageHeader
        title="Knowledge Checks"
        description="One-attempt multiple-choice tests. A student's score (0–100) is added to their leaderboard points."
        actions={
          <>
            {courses.length > 1 && (
              <Select aria-label="Filter by course" value={course} onChange={e => setCourse(e.target.value)} wrapperClassName="w-48">
                <option value="">All courses</option>
                {courses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </Select>
            )}
            <ButtonLink href="/admin/tests/new" icon={Plus} className="h-11">New knowledge check</ButtonLink>
          </>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <DataState loading={tests.loading} error={tests.error} onRetry={tests.reload}>
          {list.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No knowledge checks yet" description="Create one so students can start earning points."
              action={<ButtonLink href="/admin/tests/new" icon={Plus}>Create knowledge check</ButtonLink>} />
          ) : (
            <Table head={['Test', 'Course', 'Questions', 'Attempts', 'Status', 'Created']}>
              {list.map(t => (
                <Tr key={t.id}>
                  <Td>
                    <p className="font-medium text-white">{t.title}</p>
                    {t.description && <p className="max-w-xs truncate text-xs text-faint">{t.description}</p>}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{t.course?.name ?? '—'}</Td>
                  <Td className="tabular-nums">{questionCount(t)}</Td>
                  <Td className="tabular-nums">{t._count?.attempts ?? 0}</Td>
                  <Td>{status(t)}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(t.createdAt)}</Td>
                </Tr>
              ))}
            </Table>
          )}
        </DataState>
      </Card>
    </>
  );
}
