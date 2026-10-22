// app/admin/exams/page.tsx — final test results: score, practical link, earn / certificate choices
"use client";

import { useMemo, useState } from 'react';
import { Download, ExternalLink, GraduationCap } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDateTime, scoreTone } from '@/lib/format';
import type { ExamResult, ExamStage } from '@/lib/types';
import { Avatar, Badge, Button, Card, DataState, EmptyState, PageHeader, Table, Tabs, Td, Tr } from '@/components/ui';

type Filter = 'ALL' | 'EARN' | 'CERTIFIED' | 'IN_PROGRESS';

const STAGE_LABEL: Record<ExamStage, string> = {
  NOT_STARTED: 'Not started',
  MCQ: 'Answering',
  PRACTICAL: 'Practical',
  ASK_EARN: 'Choosing',
  JOIN_GROUP: 'Joining group',
  ASK_CERTIFICATE: 'Choosing',
  CERTIFICATE: 'Posting',
  BOOTCAMP: 'Finished',
};

const yesNo = (v: boolean | null) => (v === null ? '' : v ? 'yes' : 'no');

function downloadCsv(rows: ExamResult[]) {
  const head = ['Name', 'Email', 'Course', 'Score', 'Practical link', 'Practical note', 'Wants to earn', 'Joined group', 'Wants certificate', 'Certificate', 'Post link', 'Started'];
  const lines = rows.map(r => [
    r.student.name, r.student.email, r.test.course ?? '', r.score ?? '', r.practicalUrl ?? '', r.practicalNote ?? '',
    yesNo(r.wantsToEarn), r.joinedGroupAt ? 'yes' : '', yesNo(r.wantsCertificate), r.certificate?.code ?? '', r.certificate?.postUrl ?? '', r.startedAt,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'final-test-results.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AdminExamsPage() {
  const results = useApi<ExamResult[]>('/v2/exams/admin/results');
  const [filter, setFilter] = useState<Filter>('ALL');
  const all = useMemo(() => results.data ?? [], [results.data]);

  const rows = all.filter(r =>
    filter === 'EARN' ? r.wantsToEarn
      : filter === 'CERTIFIED' ? !!r.certificate
      : filter === 'IN_PROGRESS' ? r.stage !== 'BOOTCAMP'
      : true);

  return (
    <>
      <PageHeader
        title="Final tests"
        description="Scores, practical work, and who wants to earn with their skill or took a certificate."
        actions={<Button variant="secondary" icon={Download} disabled={!rows.length} onClick={() => downloadCsv(rows)}>Export CSV</Button>}
      />

      <Tabs
        className="mb-6"
        value={filter}
        onChange={setFilter}
        tabs={[
          { id: 'ALL', label: 'All', count: all.length },
          { id: 'EARN', label: 'Want to earn', count: all.filter(r => r.wantsToEarn).length },
          { id: 'CERTIFIED', label: 'Certified', count: all.filter(r => r.certificate).length },
          { id: 'IN_PROGRESS', label: 'Not finished', count: all.filter(r => r.stage !== 'BOOTCAMP').length },
        ]}
      />

      <DataState loading={results.loading} error={results.error} onRetry={results.reload}>
        {rows.length === 0 ? (
          <Card padded={false}><EmptyState icon={GraduationCap} title="No results yet" description="Students who start a final test show up here." /></Card>
        ) : (
          <Table head={['Student', 'Course', 'Score', 'Practical', 'Earn', 'Certificate', 'Status']}>
            {rows.map(r => (
              <Tr key={r.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.student.name} src={r.student.imageUrl} size={32} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{r.student.name}</p>
                      <p className="truncate text-xs text-faint">{r.student.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-muted">{r.test.course}</Td>
                <Td>{r.score === null ? <span className="text-faint">—</span> : <Badge tone={scoreTone(r.score)}>{r.score}%</Badge>}</Td>
                <Td>
                  {r.practicalUrl ? (
                    <a href={r.practicalUrl} target="_blank" rel="noopener noreferrer" title={r.practicalNote ?? undefined}
                      className="inline-flex items-center gap-1 text-brand-soft hover:underline">
                      Open <ExternalLink size={12} />
                    </a>
                  ) : <span className="text-faint">—</span>}
                </Td>
                <Td>
                  {r.wantsToEarn === null ? <span className="text-faint">—</span>
                    : r.wantsToEarn ? <Badge tone="success">Yes{r.joinedGroupAt ? ' · joined' : ''}</Badge>
                    : <Badge>No</Badge>}
                </Td>
                <Td>
                  {r.certificate ? (
                    <div className="flex flex-col gap-0.5">
                      <a href={`/certificate/${r.certificate.code}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gold hover:underline">{r.certificate.code}</a>
                      {r.certificate.postUrl && (
                        <a href={r.certificate.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-soft hover:underline">
                          {r.certificate.platform ?? 'Post'} post <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ) : r.wantsCertificate === false ? <span className="text-xs text-faint">Declined</span> : <span className="text-faint">—</span>}
                </Td>
                <Td>
                  <Badge tone={r.stage === 'BOOTCAMP' ? 'success' : 'brand'}>{STAGE_LABEL[r.stage]}</Badge>
                  <p className="mt-1 text-xs text-faint">{formatDateTime(r.startedAt)}</p>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </DataState>
    </>
  );
}
