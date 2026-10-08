// app/admin/cohorts/page.tsx — list cohorts (GET /admin/cohorts)
"use client";

import Link from 'next/link';
import { BookOpen, CalendarDays, Layers, Plus, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, isPast, plural } from '@/lib/format';
import type { Cohort } from '@/lib/types';
import { Badge, ButtonLink, Card, DataState, EmptyState, PageHeader } from '@/components/ui';

function status(c: Cohort) {
  if (isPast(c.endDate)) return { label: 'Ended', tone: 'neutral' as const };
  if (isPast(c.startDate)) return { label: 'Running', tone: 'success' as const };
  return { label: 'Upcoming', tone: 'brand' as const };
}

export default function CohortsPage() {
  const cohorts = useApi<Cohort[]>('/admin/cohorts');
  const list = [...(cohorts.data ?? [])].sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate));

  return (
    <>
      <PageHeader
        title="Cohorts"
        description="Each cohort is one academic cycle with its own courses and students."
        actions={<ButtonLink href="/admin/cohorts/new" icon={Plus}>New cohort</ButtonLink>}
      />

      <DataState loading={cohorts.loading} error={cohorts.error} onRetry={cohorts.reload}>
        {list.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon={Layers} title="No cohorts yet" description="Create your first academic cycle to get started."
              action={<ButtonLink href="/admin/cohorts/new" icon={Plus}>Create cohort</ButtonLink>} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map(c => {
              const st = status(c);
              return (
                <Link key={c.id} href={`/admin/cohorts/${c.id}`} className="group">
                  <Card className="h-full transition-colors group-hover:border-brand/40">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand-soft"><Layers size={20} /></span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-4 text-lg font-semibold text-white group-hover:text-brand-soft">{c.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <CalendarDays size={14} /> {formatDate(c.startDate)} – {formatDate(c.endDate)}
                    </p>
                    <div className="mt-4 flex gap-4 border-t border-line pt-4 text-sm text-muted">
                      <span className="inline-flex items-center gap-1.5"><Users size={14} /> {plural(c._count?.students ?? 0, 'student')}</span>
                      <span className="inline-flex items-center gap-1.5"><BookOpen size={14} /> {plural(c._count?.courses ?? 0, 'course')}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </DataState>
    </>
  );
}
