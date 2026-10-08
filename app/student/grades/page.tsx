// app/student/grades/page.tsx
"use client";

import { CheckCircle2, Clock, ExternalLink, GraduationCap } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, scoreTone } from '@/lib/format';
import { Badge, Card, CardHeader, DataState, EmptyState, PageHeader, Table, Td, Tr } from '@/components/ui';

// grade / feedback / score are optional — the API may withhold them until results are released
interface AssignmentSubmission {
  id: string;
  submittedAt: string;
  cloudinaryUrl?: string | null;
  grade?: number | null;
  feedback?: string | null;
  assignment: { title: string };
}

interface AssessmentResult {
  id: string;
  submittedAt: string;
  score?: number | null;
  assessment: { title: string; type: string };
}

interface Grades {
  assignments: AssignmentSubmission[];
  assessments: AssessmentResult[];
}

function Score({ value }: { value?: number | null }) {
  if (value === null || value === undefined) return <Badge><Clock size={11} /> Pending</Badge>;
  return <Badge tone={scoreTone(value)} className="text-sm font-bold tabular-nums">{value}%</Badge>;
}

export default function StudentGradesPage() {
  const grades = useApi<Grades>('/student/grades');
  const assignments = grades.data?.assignments ?? [];
  const assessments = grades.data?.assessments ?? [];

  return (
    <>
      <PageHeader title="Grades" description="Assignment scores and assessment results." />

      <DataState loading={grades.loading} error={grades.error} onRetry={grades.reload}>
        <div className="space-y-6">
          <Card padded={false} className="overflow-hidden">
            <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Assignments" icon={GraduationCap} /></div>
            {assignments.length === 0 ? (
              <EmptyState icon={GraduationCap} title="No assignment submissions yet" className="py-10" />
            ) : (
              <Table head={['Assignment', 'Submitted', 'Grade', 'Feedback', 'File']}>
                {assignments.map(s => (
                  <Tr key={s.id}>
                    <Td className="font-medium text-white">{s.assignment.title}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(s.submittedAt)}</Td>
                    <Td><Score value={s.grade} /></Td>
                    <Td className="max-w-xs text-muted">{s.feedback || <span className="text-faint">—</span>}</Td>
                    <Td>
                      {s.cloudinaryUrl ? (
                        <a href={s.cloudinaryUrl} target="_blank" rel="noopener noreferrer" aria-label="Open submitted file" className="text-brand-soft hover:text-white">
                          <ExternalLink size={16} />
                        </a>
                      ) : <span className="text-faint">—</span>}
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Assessments" icon={CheckCircle2} /></div>
            {assessments.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No assessment results yet" className="py-10" />
            ) : (
              <Table head={['Assessment', 'Type', 'Submitted', 'Score']}>
                {assessments.map(r => (
                  <Tr key={r.id}>
                    <Td className="font-medium text-white">{r.assessment.title}</Td>
                    <Td><Badge className="uppercase">{r.assessment.type}</Badge></Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(r.submittedAt)}</Td>
                    <Td><Score value={r.score} /></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      </DataState>
    </>
  );
}
