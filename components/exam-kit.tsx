// components/exam-kit.tsx — visual pieces for the course final test (timer ring, journey, confetti, slides…)
"use client";

import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Check, Download, FileText, ListChecks, Presentation, Rocket, Volume2, VolumeX, Wrench } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import type { ExamStage, Library } from '@/lib/types';
import { isMuted, setMuted } from '@/components/welcome/sounds';
import { cx } from '@/components/ui';

/* ── countdown ring ─────────────────────────────────────────── */

export function TimerRing({ left, total, size = 64 }: { left: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const urgent = left <= 10;
  return (
    <div className={cx('relative shrink-0', left <= 5 && left > 0 && 'animate-tick')} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-white/10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - left / total)}
          className={cx('transition-[stroke-dashoffset] duration-300 ease-linear', urgent ? 'stroke-danger' : 'stroke-brand')}
        />
      </svg>
      <span className={cx('absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums', urgent ? 'text-danger' : 'text-white')}>
        {left}
      </span>
    </div>
  );
}

/* ── question progress dots ─────────────────────────────────── */

export function QuestionDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors',
          i < current ? 'bg-brand' : i === current ? 'bg-gold' : 'bg-white/10')} />
      ))}
    </div>
  );
}

/* ── the journey: questions → practical → certificate → bootcamp ── */

const JOURNEY = [
  { label: 'Questions', icon: ListChecks },
  { label: 'Practical', icon: Wrench },
  { label: 'Certificate', icon: Award },
  { label: 'Bootcamp', icon: Rocket },
];

const STEP_OF: Record<ExamStage, number> = {
  NOT_STARTED: 0, MCQ: 0, PRACTICAL: 1, ASK_EARN: 2, JOIN_GROUP: 2, ASK_CERTIFICATE: 2, CERTIFICATE: 2, BOOTCAMP: 3,
};

export function Journey({ stage }: { stage: ExamStage }) {
  const at = STEP_OF[stage];
  return (
    <ol className="mx-auto mb-8 flex max-w-xl items-center">
      {JOURNEY.map(({ label, icon: Icon }, i) => {
        const done = i < at || stage === 'BOOTCAMP';
        const active = i === at && stage !== 'BOOTCAMP';
        return (
          <li key={label} className={cx('flex items-center', i < JOURNEY.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <span className={cx('inline-flex size-9 items-center justify-center rounded-full border transition-all',
                done ? 'border-success bg-success text-black'
                  : active ? 'border-gold bg-gold/15 text-gold shadow-[0_0_0_4px_rgba(245,183,49,0.12)]'
                  : 'border-line bg-surface-2 text-faint')}>
                {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
              </span>
              <span className={cx('text-[11px] font-medium', done || active ? 'text-gray-200' : 'text-faint')}>{label}</span>
            </div>
            {i < JOURNEY.length - 1 && <span className={cx('mx-1 mb-5 h-0.5 flex-1 rounded-full', i < at ? 'bg-success' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ── animated count-up for the score ────────────────────────── */

export function useCountUp(target: number, ms = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    // reduced motion: the first frame jumps straight to the target
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = duration ? Math.min(1, (now - start) / duration) : 1;
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/* ── confetti burst (pure CSS) ──────────────────────────────── */

const CONFETTI_COLORS = ['#2389DB', '#7CC0F5', '#F5B731', '#34D399', '#ffffff'];

/** deterministic 0–1 noise, so the layout is stable across renders */
const noise = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const bits = useMemo(() => Array.from({ length: pieces }, (_, i) => ({
    left: noise(i, 1) * 100,
    delay: noise(i, 2) * 0.6,
    duration: 2.2 + noise(i, 3) * 1.6,
    rotate: noise(i, 4) * 360,
    drift: (noise(i, 5) - 0.5) * 160,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  })), [pieces]);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className={cx('confetti absolute -top-4 block size-2.5', b.round ? 'rounded-full' : 'rounded-[2px]')}
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            ['--rot' as string]: `${b.rotate}deg`,
            ['--drift' as string]: `${b.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ── sound on/off ───────────────────────────────────────────── */

export function MuteToggle() {
  // only rendered client-side (inside the student shell), so localStorage is available
  const [muted, setState] = useState(isMuted);
  return (
    <button
      type="button"
      onClick={() => { setMuted(!muted); setState(!muted); }}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted hover:text-white"
    >
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );
}

/* ── the student's own course slides, from their Library ────── */

const SLIDE_ICON: Record<string, typeof FileText> = { pdf: FileText, slides: Presentation, slide: Presentation };

export function CourseSlides({ courseId, courseName, compact = false }: { courseId: string; courseName: string; compact?: boolean }) {
  const library = useApi<Library>(`/v2/courses/${courseId}/library`);
  const items = library.data?.materials ?? [];
  if (library.loading || library.error || items.length === 0) return null;

  return (
    <div className={cx('rounded-2xl border border-brand/25 bg-brand/[0.06]', compact ? 'p-4' : 'p-5 sm:p-6')}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-soft"><BookOpen size={18} /></span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{compact ? 'Your class slides' : `Revise with your ${courseName} slides`}</p>
          <p className="text-sm text-muted">
            {compact ? 'Use them for the practical.' : 'Every question comes from the material you were taught in class.'}
          </p>
        </div>
      </div>
      <div className={cx('mt-4 grid gap-2', !compact && 'sm:grid-cols-2')}>
        {items.map(m => {
          const Icon = SLIDE_ICON[m.type] ?? FileText;
          return (
            <a key={m.id} href={m.cloudinaryUrl} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-line bg-ink/50 px-3.5 py-3 text-sm transition-colors hover:border-brand/50">
              <Icon size={18} className="shrink-0 text-brand-soft" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-gray-100">{m.title}</span>
                {m.description && <span className="block truncate text-xs text-faint">{m.description}</span>}
              </span>
              <Download size={15} className="shrink-0 text-faint group-hover:text-brand-soft" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

