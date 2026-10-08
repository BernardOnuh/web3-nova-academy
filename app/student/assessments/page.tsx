// app/student/assessments/page.tsx
"use client";

import { ArrowRight, Clock, FileText } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, isPast } from '@/lib/format';
import { Badge, ButtonLink, Card, DataState, EmptyState, PageHeader } from '@/components/ui';

interface Assessment {
  id: string;
  title: string;
  type?: string;
  description?: string;
  dueDate?: string;
  timeLimit?: number;
}

export default function StudentAssessmentsPage() {
  const assessments = useApi<Assessment[]>('/student/assessments');
  const list = Array.isArray(assessments.data) ? assessments.data : [];

  return (
    <>
      <PageHeader title="Assessments" description="Tests and exams for your course." />

      <DataState loading={assessments.loading} error={assessments.error} onRetry={assessments.reload}>
        {list.length === 0 ? (
          <Card padded={false}><EmptyState icon={FileText} title="No assessments yet" description="Upcoming tests and exams will appear here." /></Card>
        ) : (
          <div className="space-y-3">
            {list.map(a => {
              const closed = isPast(a.dueDate);
              return (
                <Card key={a.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                    <FileText size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{a.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {a.type && <Badge className="uppercase">{a.type}</Badge>}
                      {a.timeLimit ? <Badge><Clock size={11} /> {a.timeLimit} min</Badge> : null}
                      {a.dueDate && (
                        <span className={`text-xs ${closed ? 'text-danger' : 'text-faint'}`}>Due {formatDate(a.dueDate)}</span>
                      )}
                    </div>
                  </div>
                  {closed ? (
                    <Badge tone="danger">Closed</Badge>
                  ) : (
                    <ButtonLink href={`/student/assessments/${a.id}`} icon={ArrowRight}>Start</ButtonLink>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </DataState>
    </>
  );
}
