// app/student/exam/[id]/page.tsx — take a course final test, then: earn? → group → certificate → 3-month bootcamp
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowRight, Award, Briefcase, Check, CheckCircle2, Copy, ExternalLink, GraduationCap, Handshake, Link2, ListChecks,
  Lock, Rocket, Sparkles, Timer, TrendingUp, Users, Wrench, type LucideIcon,
} from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { scoreTone } from '@/lib/format';
import { BOOTCAMP_LENGTH, BOOTCAMP_URL, EARN_GROUP_URL } from '@/lib/programme';
import type { ExamView, Profile } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { sfx } from '@/components/welcome/sounds';
import { Confetti, CourseSlides, Journey, MuteToggle, QuestionDots, TimerRing, useCountUp } from '@/components/exam-kit';
import { Alert, Button, ButtonLink, Card, DataState, Input, PageHeader, Textarea, cx } from '@/components/ui';

const LETTERS = 'ABCDEFGHIJ';

const TONE = {
  success: { text: 'text-success', ring: 'stroke-success', word: 'Excellent work!' },
  warning: { text: 'text-warning', ring: 'stroke-warning', word: 'Good effort!' },
  danger: { text: 'text-danger', ring: 'stroke-danger', word: 'You made it through!' },
};

/* ── layout helpers ─────────────────────────────────────────── */

function Hero({ icon: Icon, eyebrow, title, children, tone = 'gold' }: {
  icon: LucideIcon; eyebrow: string; title: string; children?: ReactNode; tone?: 'gold' | 'brand';
}) {
  return (
    <div className={cx(
      'relative overflow-hidden rounded-3xl border px-6 py-10 text-center animate-pop-in sm:px-10',
      tone === 'gold' ? 'border-gold/25 bg-gradient-to-b from-gold/[0.12] via-surface to-surface' : 'border-brand/25 bg-gradient-to-b from-brand/[0.14] via-surface to-surface',
    )}>
      <div className={cx('pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl',
        tone === 'gold' ? 'bg-gold/20' : 'bg-brand/25')} />
      <span className={cx('relative mx-auto inline-flex size-16 items-center justify-center rounded-2xl',
        tone === 'gold' ? 'bg-gold text-black' : 'bg-brand text-white')}>
        <Icon size={30} />
      </span>
      <p className={cx('relative mt-5 text-xs font-semibold uppercase tracking-[0.25em]', tone === 'gold' ? 'text-gold' : 'text-brand-soft')}>{eyebrow}</p>
      <h2 className="relative mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h2>
      {children && <div className="relative mt-3 text-muted">{children}</div>}
    </div>
  );
}

function Perks({ items }: { items: { icon: LucideIcon; label: string }[] }) {
  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="rounded-xl border border-line bg-ink/40 px-2 py-3">
          <Icon size={18} className="mx-auto text-gold" />
          <p className="mt-1.5 text-xs font-medium text-gray-200">{label}</p>
        </div>
      ))}
    </div>
  );
}

function YesNo({ busy, onYes, onNo, yes, no }: { busy: boolean; onYes: () => void; onNo: () => void; yes: string; no: string }) {
  return (
    <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
      <Button size="lg" variant="gold" className="shine" disabled={busy} onClick={() => { sfx.pop(); onYes(); }}>{yes}</Button>
      <Button size="lg" variant="secondary" disabled={busy} onClick={onNo}>{no}</Button>
    </div>
  );
}

/** Small certificate mock-up with the student's name, to show what they're working towards. */
function CertificatePreview({ name, course, code }: { name: string; course: string; code?: string }) {
  return (
    <div className="shine mx-auto w-full max-w-md rotate-[-1.5deg] rounded-xl bg-[#FBF8F1] p-1.5 shadow-[0_20px_50px_-20px_rgba(245,183,49,0.45)]">
      <div className="rounded-lg border-2 border-[#C9971F]/70 px-5 py-6 text-center text-[#0B1B33]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C9971F]">Certificate of Completion</p>
        <p className="mt-3 font-serif text-2xl font-bold leading-tight">{name}</p>
        <div className="mx-auto mt-1 h-px w-1/2 bg-[#C9971F]/60" />
        <p className="mt-2 text-xs text-[#4A5568]">has completed the final test and practical for</p>
        <p className="mt-1 font-bold text-[#1F6FD6]">{course}</p>
        <div className="mt-4 flex items-center justify-between text-[10px] text-[#4A5568]">
          <span>Web3Nova Academy</span>
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#C9971F] text-white"><Award size={16} /></span>
          <span className="font-mono">{code ?? 'W3N-••••-••••'}</span>
        </div>
      </div>
    </div>
  );
}

/* ── part 1: one timed question at a time ───────────────────── */

/** When the timer hits 0 whatever is selected (or nothing) is sent. */
function QuestionStep({ exam, onAnswer }: { exam: ExamView; onAnswer: (index: number, choice: string | null) => Promise<void> }) {
  const q = exam.question!;
  const [choice, setChoice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deadline] = useState(() => Date.now() + q.secondsLeft * 1000);
  const [left, setLeft] = useState(q.secondsLeft);
  const sent = useRef(false);
  const choiceRef = useRef<string | null>(null);
  const lastTick = useRef(q.secondsLeft);

  const send = useCallback(async (c: string | null) => {
    if (sent.current) return;
    sent.current = true;
    setSending(true);
    await onAnswer(q.index, c);
  }, [onAnswer, q.index]);

  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s !== lastTick.current && s <= 5 && s > 0) sfx.tick();
      lastTick.current = s;
      if (s === 0) send(choiceRef.current);
    }, 250);
    return () => clearInterval(id);
  }, [deadline, send]);

  const pick = useCallback((letter: string) => {
    if (sent.current) return;
    choiceRef.current = letter;
    setChoice(letter);
    sfx.pop();
  }, []);

  // keyboard: A–D or 1–4 to pick, Enter for next
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const k = ev.key.toUpperCase();
      const byLetter = LETTERS.indexOf(k);
      const byNumber = Number(k) - 1;
      const i = byLetter >= 0 ? byLetter : byNumber;
      if (i >= 0 && i < q.options.length) pick(LETTERS[i]);
      else if (ev.key === 'Enter' && choiceRef.current) send(choiceRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick, send, q.options.length]);

  const last = q.index + 1 === exam.questionsCount;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="sticky top-14 z-10 -mx-4 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:top-4">
        <div className="flex items-center gap-4">
          <TimerRing left={left} total={exam.secondsPerQuestion} size={58} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                Question {q.index + 1} <span className="font-normal text-faint">of {exam.questionsCount}</span>
              </p>
              <MuteToggle />
            </div>
            <div className="mt-2"><QuestionDots total={exam.questionsCount} current={q.index} /></div>
          </div>
        </div>
      </div>

      <div className="animate-fade-up">
        <p className="mb-4 text-xl font-bold leading-snug text-white sm:text-2xl">{q.q}</p>
        <div className="space-y-2.5" role="radiogroup" aria-label="Answers">
          {q.options.map((opt, oi) => {
            const letter = LETTERS[oi];
            const selected = choice === letter;
            return (
              <button
                key={letter}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={sending}
                onClick={() => pick(letter)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-[15px] transition-all',
                  selected
                    ? 'scale-[1.01] border-brand bg-brand/15 text-white shadow-[0_8px_30px_-12px_rgba(35,137,219,0.8)]'
                    : 'border-line bg-surface/80 text-gray-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]',
                )}
              >
                <span className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors',
                  selected ? 'bg-brand text-white' : 'bg-surface-2 text-muted')}>
                  {selected ? <Check size={18} strokeWidth={3} /> : letter}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button size="lg" className="h-14 w-full text-base" icon={last ? CheckCircle2 : ArrowRight} loading={sending} disabled={!choice} onClick={() => send(choice)}>
        {last ? 'Finish multiple choice' : 'Lock in & next'}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-faint">
        <Lock size={12} /> No going back. When the timer ends, your selected answer is sent.
      </p>
    </div>
  );
}

/* ── score reveal right after the last question ─────────────── */

function ScoreReveal({ score, total, onContinue }: { score: number; total: number; onContinue: () => void }) {
  const shown = useCountUp(score);
  const tone = TONE[scoreTone(score)];
  const size = 168;
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => { sfx.win(); }, []);

  return (
    <>
      {score >= 50 && <Confetti />}
      <div className="mx-auto max-w-xl">
        <Hero icon={Sparkles} eyebrow="Part 1 complete" title={tone.word} tone="brand">
          <div className="relative mx-auto mt-4" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={12} className="stroke-white/10" />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={12} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} className={tone.ring} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cx('text-5xl font-extrabold tabular-nums', tone.text)}>{shown}%</span>
              <span className="text-xs text-muted">{Math.round((score / 100) * total)}/{total} correct</span>
            </div>
          </div>
          <p className="mt-4">
            <span className="font-semibold text-gold">+{score} points</span> added to the leaderboard.
            One more step: show us what you can build.
          </p>
          <Button size="lg" className="shine mt-6 w-full sm:w-auto" icon={Wrench} onClick={onContinue}>Start the practical</Button>
        </Hero>
      </div>
    </>
  );
}

/* ── page ───────────────────────────────────────────────────── */

export default function TakeExamPage() {
  const { id } = useParams<{ id: string }>();
  const { confirm, toast } = useFeedback();
  const exam = useApi<ExamView>(`/v2/exams/${id}`);
  const me = useApi<Profile>('/v2/auth/me');
  const { setData, reload } = exam;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practicalUrl, setPracticalUrl] = useState('');
  const [practicalNote, setPracticalNote] = useState('');
  const [postUrl, setPostUrl] = useState('');
  // remounts the question after a failed send so the student can answer again
  const [retry, setRetry] = useState(0);
  // celebrate only moments that happened on this visit, not on every reload
  const [revealScore, setRevealScore] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevStage = useRef<string | null>(null);

  const e = exam.data;

  useEffect(() => {
    if (!e) return;
    if (prevStage.current === 'MCQ' && e.stage !== 'MCQ') setRevealScore(true);
    if (prevStage.current === 'CERTIFICATE' && e.stage === 'BOOTCAMP') {
      setCelebrate(true);
      sfx.win();
    }
    prevStage.current = e.stage;
  }, [e]);

  const call = useCallback(async (path: string, body?: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      setData(await api<ExamView>(`/v2/exams/${id}${path}`, { body: body ?? {} }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [setData, id]);

  const answer = useCallback(async (index: number, choice: string | null) => {
    if (await call('/answer', { index, choice })) return;
    // the server keeps the clock — resync to whatever question is live now
    setRetry(n => n + 1);
    reload();
  }, [call, reload]);

  const start = async () => {
    const ok = await confirm({
      title: 'Ready? The clock starts now',
      description: `${e!.questionsCount} questions, ${e!.secondsPerQuestion} seconds each, one at a time. The timer keeps running if you leave the page, and you only get one attempt.`,
      confirmLabel: "Let's go",
    });
    if (ok) {
      sfx.rise(2);
      call('/start');
    }
  };

  const course = e?.course?.name ?? 'this course';
  const name = me.data?.name ?? 'Your Name';
  const caption = `I just finished the ${course} final test at @Web3Nova! Here's what I learnt: `;

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast('Caption copied — add what you learnt and post it');
    } catch {
      toast('Copy failed — type your own caption', 'error');
    }
  };

  let body: ReactNode = null;
  if (e) {
    switch (e.stage) {
      case 'NOT_STARTED':
        body = (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="relative overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/25 via-surface to-gold/10 p-6 sm:p-8 animate-pop-in">
              <GraduationCap size={160} className="pointer-events-none absolute -right-6 -bottom-8 text-white/[0.04]" />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Final Test</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{course}</h2>
              <p className="mt-2 max-w-md text-gray-300">Show what you learnt. Pass through both parts to unlock your certificate.</p>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { icon: ListChecks, big: String(e.questionsCount), small: 'questions' },
                  { icon: Timer, big: `${e.secondsPerQuestion}s`, small: 'per question' },
                  { icon: Wrench, big: e.practicalPrompt ? '1' : '0', small: 'practical task' },
                ].map(({ icon: Icon, big, small }) => (
                  <div key={small} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-4 text-center backdrop-blur">
                    <Icon size={18} className="mx-auto text-brand-soft" />
                    <p className="mt-1.5 text-2xl font-extrabold text-white tabular-nums">{big}</p>
                    <p className="text-[11px] text-muted">{small}</p>
                  </div>
                ))}
              </div>
            </div>

            {e.course && <CourseSlides courseId={e.course.id} courseName={e.course.name} />}

            <Card className="space-y-3">
              <p className="text-sm font-semibold text-white">Before you start</p>
              {[
                'Find a quiet spot with good network. The timer keeps running even if you leave.',
                'Questions come one at a time. You can’t go back to change an answer.',
                'Your score becomes leaderboard points, and you get one attempt.',
              ].map(t => (
                <p key={t} className="flex gap-2.5 text-sm text-muted"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />{t}</p>
              ))}
            </Card>

            <Button size="lg" className="shine h-14 w-full text-base" icon={Timer} loading={busy} onClick={start}>Start the test</Button>
          </div>
        );
        break;

      case 'MCQ':
        body = <QuestionStep key={`${e.question!.index}-${retry}`} exam={e} onAnswer={answer} />;
        break;

      case 'PRACTICAL':
        body = revealScore && e.score !== null ? (
          <ScoreReveal score={e.score} total={e.questionsCount} onContinue={() => setRevealScore(false)} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4 animate-fade-up">
            <div className="rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/[0.12] via-surface to-surface p-6 sm:p-7">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold"><Wrench size={14} /> Part 2 · Practical task</p>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-100">{e.practicalPrompt}</p>
              <p className="mt-4 text-xs text-muted">No timer here. Take your time and do your best work.</p>
            </div>
            {e.course && <CourseSlides courseId={e.course.id} courseName={e.course.name} compact />}
            <Card className="space-y-4">
              <Input label="Link to your work" icon={Link2} type="url" inputMode="url" placeholder="https://"
                value={practicalUrl} onChange={ev => setPracticalUrl(ev.target.value)}
                hint="Make sure anyone with the link can open it." />
              <Textarea label="Note (optional)" rows={4} value={practicalNote} onChange={ev => setPracticalNote(ev.target.value)}
                placeholder="Anything we should know about your work" />
              <Button size="lg" className="w-full" icon={ArrowRight} loading={busy} disabled={!practicalUrl.trim()}
                onClick={() => call('/practical', { url: practicalUrl, note: practicalNote })}>
                Submit practical
              </Button>
            </Card>
          </div>
        );
        break;

      case 'ASK_EARN':
        body = revealScore && e.score !== null ? (
          <ScoreReveal score={e.score} total={e.questionsCount} onContinue={() => setRevealScore(false)} />
        ) : (
          <div className="mx-auto max-w-xl">
            <Hero icon={TrendingUp} eyebrow="Both parts done" title="Do you want to make money with this skill?">
              <p>We connect serious students with paid gigs, client projects and work opportunities in {course}.</p>
              <Perks items={[{ icon: Briefcase, label: 'Paid gigs' }, { icon: Handshake, label: 'Client projects' }, { icon: Users, label: 'Team roles' }]} />
              <YesNo busy={busy} yes="Yes, I want to earn" no="Not right now"
                onYes={() => call('/choice', { step: 'earn', value: true })}
                onNo={() => call('/choice', { step: 'earn', value: false })} />
            </Hero>
          </div>
        );
        break;

      case 'JOIN_GROUP':
        body = (
          <div className="mx-auto max-w-xl">
            <Hero icon={Users} eyebrow="Step 1 of 2 · Earn with your skill" title="Join the work & earn group">
              <p>Opportunities are shared here first. Join, then come back for your certificate. You&apos;ll need it to be picked for work.</p>
              <div className="mt-7 flex flex-col items-center gap-3">
                <a href={EARN_GROUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => sfx.pop()}
                  className="shine inline-flex h-14 items-center gap-2 rounded-2xl bg-[#25D366] px-7 text-base font-bold text-black hover:brightness-95">
                  <ExternalLink size={18} /> Join the group
                </a>
                <Button variant="ghost" loading={busy} onClick={() => call('/choice', { step: 'joined' })}>I&apos;ve joined, continue →</Button>
              </div>
            </Hero>
          </div>
        );
        break;

      case 'ASK_CERTIFICATE':
        body = (
          <div className="mx-auto max-w-xl">
            <Hero icon={Award} eyebrow="Both parts done" title="Do you want your certificate?">
              <p>A verifiable Web3Nova certificate for {course}, ready for your CV and LinkedIn.</p>
              <div className="mt-6"><CertificatePreview name={name} course={course} /></div>
              <YesNo busy={busy} yes="Yes, get my certificate" no="No, skip"
                onYes={() => call('/choice', { step: 'certificate', value: true })}
                onNo={() => call('/choice', { step: 'certificate', value: false })} />
            </Hero>
          </div>
        );
        break;

      case 'CERTIFICATE':
        body = (
          <div className="mx-auto max-w-xl space-y-4">
            <Hero icon={Award} eyebrow={e.wantsToEarn ? 'Step 2 of 2 · Your certificate' : 'Your certificate'} title="One post away from your certificate">
              <p>Share what you learnt in {course} on X, Instagram or TikTok, then paste the link.</p>
              <div className="mt-6"><CertificatePreview name={name} course={course} /></div>
            </Hero>

            <Card className="space-y-4">
              {[
                'Post a photo, short video, screenshot of your practical or a quick write-up of what you learnt.',
                'Tag @Web3Nova and keep the post public.',
                'Copy the link to your post and paste it below.',
              ].map((t, i) => (
                <div key={i} className="flex gap-3 text-sm text-gray-200">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
                  <span className="pt-1">{t}</span>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <a href={`https://x.com/intent/post?text=${encodeURIComponent(caption)}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-black hover:bg-gray-200">
                  Post on X <ExternalLink size={14} />
                </a>
                <Button size="md" variant="secondary" icon={Copy} onClick={copyCaption}>Copy a caption</Button>
              </div>
            </Card>

            <Card className="space-y-4">
              <Input label="Link to your post" icon={Link2} type="url" inputMode="url" placeholder="https://x.com/… · instagram.com/… · tiktok.com/…"
                value={postUrl} onChange={ev => setPostUrl(ev.target.value)} />
              <Button size="lg" variant="gold" className="shine w-full" icon={Award} loading={busy} disabled={!postUrl.trim()}
                onClick={() => call('/certificate', { postUrl })}>
                Get my certificate
              </Button>
            </Card>
          </div>
        );
        break;

      case 'BOOTCAMP':
        body = (
          <div className="mx-auto max-w-xl space-y-5">
            {celebrate && <Confetti pieces={90} />}
            {e.certificate && (
              <div className="animate-pop-in space-y-4 text-center">
                {celebrate && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Congratulations, it&apos;s official 🎉</p>}
                <CertificatePreview name={name} course={course} code={e.certificate.code} />
                <ButtonLink href={`/certificate/${e.certificate.code}`} variant="gold" icon={ExternalLink} target="_blank" className="mt-2">
                  Open & download certificate
                </ButtonLink>
              </div>
            )}
            <Hero icon={Rocket} eyebrow="What's next" title={`Join our ${BOOTCAMP_LENGTH} bootcamp`} tone="brand">
              <p>Go from beginner to job-ready with live classes, real projects, mentorship and a portfolio you can get paid for.</p>
              <Perks items={[{ icon: GraduationCap, label: 'Live classes' }, { icon: Wrench, label: 'Real projects' }, { icon: Users, label: 'Mentorship' }]} />
              <div className="mt-7 flex flex-col items-center gap-3">
                <a href={BOOTCAMP_URL} target="_blank" rel="noopener noreferrer" onClick={() => sfx.pop()}
                  className="shine inline-flex h-14 items-center gap-2 rounded-2xl bg-gold px-7 text-base font-bold text-black hover:bg-gold-strong">
                  <Rocket size={18} /> Join the {BOOTCAMP_LENGTH} bootcamp
                </a>
                <ButtonLink href="/student" variant="ghost">Back to dashboard</ButtonLink>
              </div>
            </Hero>
          </div>
        );
        break;
    }
  }

  const showJourney = e && e.stage !== 'MCQ' && !(revealScore && (e.stage === 'PRACTICAL' || e.stage === 'ASK_EARN'));

  return (
    <>
      {(!e || e.stage === 'NOT_STARTED') && (
        <PageHeader back={{ href: '/student/exam', label: 'Final Test' }} title="" />
      )}
      {error && <Alert className="mx-auto mb-6 max-w-2xl" onDismiss={() => setError(null)}>{error}</Alert>}
      <DataState loading={exam.loading} error={exam.error} onRetry={exam.reload}>
        {showJourney && <Journey stage={e.stage} />}
        {body}
      </DataState>
    </>
  );
}
