// app/student/diagnostic/page.tsx — take the course Knowledge Check (one attempt)
"use client";

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, Lock, Target, Trophy } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDateTime, scoreTone } from '@/lib/format';
import { useCountdown } from '@/lib/use-countdown';
import type { TestDetail, TestSummary } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { Alert, Badge, Button, ButtonLink, Card, DataState, EmptyState, PageHeader, cx } from '@/components/ui';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface Result { score: number; total: number; points: number }

/** first test stays locked until 24h after the welcome tour */
function LockedUntil({ until, reason, onUnlock }: { until: string | null; reason: string | null; onUnlock: () => void }) {
  const c = useCountdown(until);
  const unlocked = !!c?.done;
  useEffect(() => {
    if (unlocked) onUnlock();
  }, [unlocked, onUnlock]);
  return (
    <span className="inline-flex items-center gap-2 self-start rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold sm:self-center" title={reason ?? undefined}>
      <Lock size={14} /> {c ? `Unlocks in ${c.label}` : reason ?? 'Locked'}
    </span>
  );
}

const TONE_PANEL = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
};

export default function StudentDiagnosticPage() {
  const { confirm } = useFeedback();
  const tests = useApi<TestSummary[]>('/v2/tests');
  const [active, setActive] = useState<TestDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openTest(id: string) {
    setError(null);
    setResult(null);
    setAnswers({});
    setOpening(id);
    try {
      setActive(await api<TestDetail>(`/v2/tests/${id}`));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setOpening(null);
    }
  }

  async function submit() {
    if (!active) return;
    const ok = await confirm({
      title: 'Submit your answers?',
      description: 'You only get one attempt. Your score is final and is added to your leaderboard points.',
      confirmLabel: 'Submit',
    });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<Result>(`/v2/tests/${active.id}/submit`, { body: { answers } });
      setResult(res);
      setActive(null);
      tests.reload();
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const answered = Object.keys(answers).length;
  const total = active?.questions.length ?? 0;

  return (
    <>
      <PageHeader
        title="Knowledge Check"
        description="A quick diagnostic for your course — one attempt, and your score becomes leaderboard points."
        actions={<ButtonLink href="/student/leaderboard" variant="secondary" icon={Trophy}>Leaderboard</ButtonLink>}
      />

      {error && <Alert className="mb-6" onDismiss={() => setError(null)}>{error}</Alert>}

      {active && !active.taken ? (
        <div className="space-y-5">
          {/* sticky progress */}
          <div className="sticky top-14 z-10 -mx-4 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:top-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-semibold text-white">{active.title}</p>
              <span className="shrink-0 text-sm text-muted tabular-nums">{answered}/{total} answered</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
            </div>
          </div>

          {active.description && <p className="text-sm text-muted">{active.description}</p>}

          {active.questions.map((q, qi) => (
            <Card key={qi}>
              <fieldset>
                <legend className="mb-4 font-semibold text-white">
                  <span className="mr-2 text-brand-soft">Q{qi + 1}.</span>
                  {q.q}
                </legend>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const letter = LETTERS[oi];
                    const selected = answers[String(qi)] === letter;
                    return (
                      <label
                        key={letter}
                        className={cx(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
                          selected ? 'border-brand/60 bg-brand/10 text-white' : 'border-line bg-ink/40 text-gray-300 hover:border-line-strong',
                        )}
                      >
                        <input
                          type="radio"
                          name={`q${qi}`}
                          value={letter}
                          checked={selected}
                          onChange={() => setAnswers(a => ({ ...a, [String(qi)]: letter }))}
                          className="sr-only"
                        />
                        <span className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                          selected ? 'bg-brand text-white' : 'bg-surface-2 text-muted')}>
                          {letter}
                        </span>
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </Card>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={submit} loading={submitting} disabled={answered < total} icon={ArrowRight}>
              {answered < total ? `Answer all questions (${answered}/${total})` : 'Submit answers'}
            </Button>
            <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
          </div>
        </div>
      ) : result ? (
        <Card className={cx('flex flex-col items-center py-12 text-center', TONE_PANEL[scoreTone(result.score)])}>
          <CheckCircle2 size={44} />
          <p className="mt-4 text-5xl font-extrabold tabular-nums">{result.score}%</p>
          <p className="mt-2 text-sm text-gray-200">
            {Math.round((result.score / 100) * result.total)}/{result.total} correct ·{' '}
            <span className="font-semibold text-gold">+{result.score} points</span> · you now have {result.points} points
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/student/leaderboard" variant="gold" icon={Trophy}>See where you rank</ButtonLink>
            <Button variant="secondary" onClick={() => setResult(null)}>Back to tests</Button>
          </div>
        </Card>
      ) : (
        <DataState loading={tests.loading} error={tests.error} onRetry={tests.reload}>
          {!tests.data?.length ? (
            <Card padded={false}>
              <EmptyState icon={Target} title="No open tests right now" description="When your course's Knowledge Check opens it will appear here." />
            </Card>
          ) : (
            <div className="space-y-3">
              {tests.data.map(t => (
                <Card key={t.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-soft">
                    <ClipboardList size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{t.title}</p>
                    {t.description && <p className="text-sm text-muted line-clamp-2">{t.description}</p>}
                    {t.closesAt && !t.taken && <p className="mt-1 text-xs text-warning">Closes {formatDateTime(t.closesAt)}</p>}
                  </div>
                  {t.lockedUntil || t.lockReason ? (
                    <LockedUntil until={t.lockedUntil ?? null} reason={t.lockReason ?? null} onUnlock={tests.reload} />
                  ) : t.taken ? (
                    <Badge tone={scoreTone(t.score ?? 0)} className="self-start px-3 py-1 text-sm sm:self-center">
                      <CheckCircle2 size={14} /> {t.score}% · done
                    </Badge>
                  ) : (
                    <Button onClick={() => openTest(t.id)} loading={opening === t.id} icon={ArrowRight}>Start test</Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </DataState>
      )}
    </>
  );
}
