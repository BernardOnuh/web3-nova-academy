// app/student/exam/page.tsx — course final tests (GET /v2/exams)
"use client";

import Link from 'next/link';
import { Award, ArrowRight, CheckCircle2, GraduationCap, ListChecks, Timer, Wrench } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDateTime, scoreTone } from '@/lib/format';
import type { ExamStage, ExamView } from '@/lib/types';
import { Badge, Card, DataState, EmptyState, PageHeader, cx } from '@/components/ui';

const CTA: Record<ExamStage, string> = {
  NOT_STARTED: 'Start the test',
  MCQ: 'Continue the questions',
  PRACTICAL: 'Continue to the practical',
  ASK_EARN: 'Continue',
  JOIN_GROUP: 'Continue',
  ASK_CERTIFICATE: 'Continue',
  CERTIFICATE: 'Claim your certificate',
  BOOTCAMP: 'View your results',
};

export default function StudentExamsPage() {
  const exams = useApi<ExamView[]>('/v2/exams');

  return (
    <>
      <PageHeader
        title="Final Test"
        description="Prove what you learnt: timed questions from your class slides, then a practical task. Finish both to unlock your certificate."
      />

      <DataState loading={exams.loading} error={exams.error} onRetry={exams.reload}>
        {!exams.data?.length ? (
          <Card padded={false}>
            <EmptyState icon={GraduationCap} title="No final test yet" description="Your course's final test will appear here when it opens." />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {exams.data.map(e => {
              const started = e.stage !== 'NOT_STARTED';
              const finished = e.stage === 'BOOTCAMP';
              const closed = !e.open && !started;
              const inner = (
                <div className={cx(
                  'group relative flex h-full flex-col overflow-hidden rounded-3xl border p-6 transition-all',
                  finished ? 'border-success/25 bg-gradient-to-br from-success/[0.10] via-surface to-surface'
                    : 'border-brand/25 bg-gradient-to-br from-brand/20 via-surface to-gold/[0.08]',
                  !closed && 'hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_20px_40px_-24px_rgba(35,137,219,0.6)]',
                )}>
                  <GraduationCap size={120} className="pointer-events-none absolute -right-4 -bottom-6 text-white/[0.04]" />
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{e.course?.name}</p>
                    {e.certificate ? <Badge tone="gold"><Award size={11} /> Certified</Badge>
                      : e.score !== null ? <Badge tone={scoreTone(e.score)}><CheckCircle2 size={11} /> {e.score}%</Badge>
                      : null}
                  </div>
                  <p className="mt-2 text-xl font-bold text-white">{e.title}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-300">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-ink/50 px-2.5 py-1"><ListChecks size={12} /> {e.questionsCount} questions</span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-ink/50 px-2.5 py-1"><Timer size={12} /> {e.secondsPerQuestion}s each</span>
                    {e.practicalPrompt && <span className="inline-flex items-center gap-1 rounded-lg bg-ink/50 px-2.5 py-1"><Wrench size={12} /> Practical</span>}
                  </div>
                  {e.closesAt && !started && <p className="mt-3 text-xs text-warning">Closes {formatDateTime(e.closesAt)}</p>}
                  <div className="mt-auto pt-6">
                    {closed ? (
                      <Badge tone="danger">Closed</Badge>
                    ) : (
                      <span className={cx('inline-flex items-center gap-2 font-semibold',
                        finished ? 'text-success' : 'text-brand-soft group-hover:text-white')}>
                        {CTA[e.stage]} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </div>
                </div>
              );
              return closed ? <div key={e.id}>{inner}</div> : <Link key={e.id} href={`/student/exam/${e.id}`}>{inner}</Link>;
            })}
          </div>
        )}
      </DataState>
    </>
  );
}
