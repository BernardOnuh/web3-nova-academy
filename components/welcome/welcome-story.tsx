// components/welcome/welcome-story.tsx — first-login "Wrapped"-style onboarding story
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Briefcase, Camera, Check, Code2, ExternalLink, GraduationCap, Hammer, Lightbulb, Music2, Plus, Rocket, Sparkles, Trophy, UploadCloud, Volume2, VolumeX, Wallet,
} from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useCountdown } from '@/lib/use-countdown';
import { ANTHEMS, INTRO_LABEL, INVITE_POINTS, WHATSAPP_GROUP_URL, type Gender } from '@/lib/programme';
import { useInviteTask } from '@/lib/use-invite-task';
import type { Leaderboard, OnboardingStatus } from '@/lib/types';
import { Avatar, Spinner, cx } from '../ui';
import { anthem, isMuted, setMuted, sfx, voice } from './sounds';
import './welcome.css';

type SlideId = 'enrolled' | 'courses' | 'prizes' | 'profile' | 'bonus' | 'welcome' | 'lbe' | 'leaderboard' | 'invite' | 'comeback';

/** progress bar segments; side slides light up their parent segment */
const SEGMENTS: SlideId[] = ['enrolled', 'prizes', 'profile', 'welcome', 'lbe', 'leaderboard', 'invite', 'comeback'];
const SEGMENT_OF: Partial<Record<SlideId, SlideId>> = { courses: 'enrolled', bonus: 'profile' };

/** blob colours per slide — brand blue/gold with a few Wrapped-style accents */
const THEME: Record<SlideId, { bg: string; a: string; b: string; c: string; scrim: boolean }> = {
  enrolled:    { bg: '#0A2A8C', a: '#1F6FD6', b: '#0B1E5C', c: '#F5B731', scrim: true },
  courses:     { bg: '#14104A', a: '#3B2BB5', b: '#0A0A2E', c: '#1F6FD6', scrim: true },
  prizes:      { bg: '#F5B731', a: '#FFD465', b: '#E8A317', c: '#FFE9A8', scrim: false },
  profile:     { bg: '#071634', a: '#1F6FD6', b: '#3B1E8F', c: '#0B2A8C', scrim: true },
  bonus:       { bg: '#9C1050', a: '#DB2777', b: '#5B1A8F', c: '#C2185B', scrim: true },
  welcome:     { bg: '#000000', a: '#0B2A8C', b: '#15527F', c: '#3B2A05', scrim: true },
  lbe:         { bg: '#064E45', a: '#0F766E', b: '#053B35', c: '#0B5E8C', scrim: true },
  leaderboard: { bg: '#24145E', a: '#3B2BB5', b: '#140B3A', c: '#5B3A12', scrim: true },
  invite:      { bg: '#05402C', a: '#128C7E', b: '#04261B', c: '#0B5E8C', scrim: true },
  comeback:    { bg: '#0A2A8C', a: '#1F6FD6', b: '#0B1E5C', c: '#3B1E8F', scrim: true },
};

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

function useCountUp(target: number, run: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run, duration]);
  return value;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        x: `${((i * 53) % 40) - 20}vw`,
        delay: `${(i % 12) * 90}ms`,
        duration: `${2200 + ((i * 131) % 1600)}ms`,
        color: ['#F5B731', '#2389DB', '#ffffff', '#DB2777', '#7CC0F5'][i % 5],
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: p.left, background: p.color, animationDelay: p.delay, animationDuration: p.duration, '--x': p.x } as CSSProperties} />
      ))}
    </div>
  );
}

/** big pill-style action used on every slide */
function Action({ children, onClick, variant = 'light', disabled, loading, className }: {
  children: ReactNode; onClick?: () => void; variant?: 'light' | 'ghost' | 'gold'; disabled?: boolean; loading?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cx(
        'inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 text-base font-bold transition-transform active:scale-95 disabled:opacity-50',
        variant === 'light' && 'bg-white text-black hover:bg-white/90',
        variant === 'gold' && 'bg-gold text-black hover:bg-gold-strong',
        variant === 'ghost' && 'border border-white/30 bg-white/5 text-white backdrop-blur hover:bg-white/10',
        className,
      )}
    >
      {loading && <Spinner size={18} className="text-current" />}
      {children}
    </button>
  );
}

/** Boy / Girl — picks the anthem that plays through the rest of the story */
function GenderPicker({ value, onPick }: { value: Gender | null; onPick: (g: Gender) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white/85">I&apos;m a…</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Boy or girl">
        {(['MALE', 'FEMALE'] as const).map(g => {
          const on = value === g;
          return (
            <button key={g} type="button" role="radio" aria-checked={on} onClick={() => onPick(g)}
              className={cx('rounded-2xl border px-4 py-3 text-left transition-colors',
                on ? 'border-white bg-white text-black' : 'border-white/25 bg-black/30 text-white hover:bg-white/10')}>
              <span className="block text-base font-black">{g === 'MALE' ? 'Boy' : 'Girl'}</span>
              <span className={cx('mt-0.5 flex items-center gap-1 text-xs', on ? 'text-black/70' : 'text-white/75')}>
                <Music2 size={12} /> {ANTHEMS[g].title} · {ANTHEMS[g].artist}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WelcomeStory({ initial }: { initial: OnboardingStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [slide, setSlide] = useState<SlideId>('enrolled');
  const [awarded, setAwarded] = useState<{ points: number; rank: number | null } | null>(null);

  // courses slide
  const [picked, setPicked] = useState<string[]>(() => initial.extraCourses.map(c => c.id));
  const [savingCourses, setSavingCourses] = useState(false);

  // profile slide
  const [fullName, setFullName] = useState(initial.user.name);
  const [expectation, setExpectation] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [gender, setGender] = useState<Gender | null>(initial.user.gender);
  const [savingProfile, setSavingProfile] = useState(false);
  const invite = useInviteTask();
  const [error, setError] = useState<string | null>(null);

  // leaderboard slide
  const [board, setBoard] = useState<Leaderboard | null>(null);

  const [muted, setMutedState] = useState(isMuted);
  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
    if (muted) {
      sfx.pop();
      if (gender) anthem.play(ANTHEMS[gender].src);
    } else {
      voice.stop();
      anthem.pause();
    }
  };

  // the student's anthem: starts on their first tap (browsers block autoplay) and loops until they finish
  const pickGender = (g: Gender) => {
    sfx.pop();
    setGender(g);
    anthem.play(ANTHEMS[g].src);
  };
  useEffect(() => {
    if (!gender) return;
    const start = () => anthem.play(ANTHEMS[gender].src);
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, [gender]);
  useEffect(() => () => anthem.stop(), []);

  const completing = useRef(false);
  const profileDone = !!status.profileCompletedAt;
  const needsPhoto = status.uploadsEnabled && !status.user.imageUrl;
  const needsExpectation = !status.user.expectation;
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const countdown = useCountdown(status.firstTestUnlocksAt);
  const bonusShown = useCountUp(awarded?.points ?? 0, slide === 'bonus');

  /* ── actions ─────────────────────────────────────────────── */

  const saveCourses = useCallback(async () => {
    setSavingCourses(true);
    setError(null);
    try {
      setStatus(await api<OnboardingStatus>('/v2/onboarding/courses', { method: 'PUT', body: { courseIds: picked } }));
      setSlide('prizes');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingCourses(false);
    }
  }, [picked]);

  const saveProfile = useCallback(async () => {
    setError(null);
    if (!fullName.trim()) return setError('Add your name.');
    if (needsPhoto && !image) return setError('Add a profile photo to claim your points.');
    if (!gender) return setError('Pick Boy or Girl to unlock your anthem.');
    if (needsExpectation && expectation.trim().length < 10) return setError('Tell us a little more about what you want from the course (10+ characters).');
    const fd = new FormData();
    fd.append('fullName', fullName.trim());
    if (expectation.trim()) fd.append('expectation', expectation.trim());
    if (image) fd.append('image', image);
    fd.append('gender', gender);
    setSavingProfile(true);
    try {
      const res = await api<OnboardingStatus>('/v2/onboarding/profile', { form: fd });
      setStatus(res);
      if (res.awarded) {
        setAwarded({ points: res.awarded, rank: res.rank ?? null });
        setSlide('bonus');
      } else {
        setSlide('welcome');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }, [fullName, expectation, image, gender, needsPhoto, needsExpectation]);

  const next = useCallback(() => {
    setError(null);
    switch (slide) {
      case 'enrolled': return setSlide('prizes');
      case 'courses': return void saveCourses();
      case 'prizes': return setSlide('profile');
      case 'profile': return profileDone ? setSlide('welcome') : void saveProfile();
      case 'bonus': return setSlide('welcome');
      case 'welcome': return setSlide('lbe');
      case 'lbe': return setSlide('leaderboard');
      case 'leaderboard': return setSlide('invite');
      case 'invite': return setSlide('comeback');
    }
  }, [slide, profileDone, saveCourses, saveProfile]);

  const back = useCallback(() => {
    setError(null);
    const prev: Partial<Record<SlideId, SlideId>> = {
      courses: 'enrolled', prizes: 'enrolled', profile: 'prizes', bonus: 'profile',
      welcome: 'profile', lbe: 'welcome', leaderboard: 'lbe', invite: 'leaderboard', comeback: 'invite',
    };
    if (slide === 'enrolled') {
      if (status.availableCourses.length) setSlide('courses'); // swipe left = choose more courses
      return;
    }
    const p = prev[slide];
    if (p) setSlide(p);
  }, [slide, status.availableCourses.length]);

  const course = status.course?.name ?? 'your course';
  const narration: Partial<Record<SlideId, { at: number; text: string }>> = {
    courses: { at: 400, text: 'Hungry for more? Add another course. The more you learn, the more you earn.' },
    prizes: { at: 1200, text: 'Seven days. Show up every day, give it everything, and there are prizes to be won.' },
    profile: { at: 600, text: 'Claim your spot. The first ten students to create their profile get two hundred points. Move fast.' },
    bonus: { at: 1700, text: `Yes! ${awarded?.points ?? ''} points. You are already on the board. This is just the beginning.` },
    welcome: { at: 900, text: "Welcome to Web3Nova. We don't just teach. We help you build a career from it." },
    lbe: { at: 2600, text: 'Learn. Build. Earn. That is the Web3Nova way.' },
    leaderboard: { at: 900, text: 'This is your starting line. Every Knowledge Check moves you up. Keep climbing.' },
    invite: { at: 700, text: 'Winners bring their people. Follow the instructions in the group, invite your friends to the seven day boot camp, then send us proof for one hundred more points.' },
    comeback: { at: 1600, text: `Come back in twenty four hours for your ${course} Knowledge Check. There will be rewards. Believe in yourself. See you tomorrow.` },
  };

  // sound cues timed to each slide's animations (generated in the browser — no downloads)
  const firstSlide = useRef(true);
  useEffect(() => {
    if (firstSlide.current) { firstSlide.current = false; return; } // no autoplay before the first tap
    sfx.whoosh();
    const at = (ms: number, play: () => void) => setTimeout(play, ms);
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (slide === 'prizes') timers.push(at(220, sfx.boom), at(1550, sfx.pop));
    if (slide === 'bonus') {
      timers.push(at(200, sfx.win));
      for (let t = 250; t < 1600; t += 110) timers.push(at(t, sfx.tick));
    }
    if (slide === 'welcome') timers.push(at(2150, () => sfx.rise(2)));
    if (slide === 'lbe') timers.push(at(0, () => sfx.rise(0)), at(900, () => sfx.rise(1)), at(1800, () => sfx.rise(2)));
    if (slide === 'comeback') timers.push(at(700, sfx.chime));

    // motivational narration, spoken after each slide's big moment
    const line = narration[slide];
    if (line) timers.push(at(line.at, () => voice.say(line.text)));

    return () => {
      timers.forEach(clearTimeout);
      voice.stop();
    };
    // narration text is read when the slide opens; later status changes shouldn't re-trigger it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  // rank reveal lands with a boom once standings arrive
  useEffect(() => {
    if (slide === 'leaderboard' && board) sfx.boom();
  }, [slide, board]);

  // entering the leaderboard: fetch fresh standings (bonus points included)
  useEffect(() => {
    if (slide !== 'leaderboard') return;
    let alive = true;
    api<Leaderboard>('/v2/leaderboard?top=200', { auth: false })
      .then(b => alive && setBoard(b))
      .catch(() => {});
    return () => { alive = false; };
  }, [slide]);

  // final slide starts the 24h countdown (once)
  useEffect(() => {
    if (slide !== 'comeback' || completing.current) return;
    completing.current = true;
    api<OnboardingStatus>('/v2/onboarding/complete', { method: 'POST' })
      .then(setStatus)
      .catch(err => { completing.current = false; setError(errorMessage(err)); });
  }, [slide]);

  /* ── input: keys + swipe ─────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back]);

  const start = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, label, [data-noswipe]')) return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    // swipe right = continue, swipe left = back (on the first slide: choose more courses)
    if (dx > 0) next();
    else back();
  };

  /* ── slides ──────────────────────────────────────────────── */

  const theme = THEME[slide];
  const segment = SEGMENT_OF[slide] ?? slide;
  const segIndex = SEGMENTS.indexOf(segment);
  const firstName = (status.user.name || status.user.studentName || '').split(' ')[0];
  const myEntry = board?.entries.find(e => e.id === status.user.id);
  const courseNames = [status.course?.name, ...status.extraCourses.map(c => c.name)].filter(Boolean) as string[];

  let body: ReactNode;
  switch (slide) {
    case 'enrolled':
      body = (
        <>
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-gold" style={d(100)}>{status.cohort?.name ?? 'Web3Nova Academy'}</p>
          <h1 className="rise mt-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl" style={d(250)}>
            It&apos;s official{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="rise mt-8 text-xl text-white/80 sm:text-2xl" style={d(700)}>You enrolled for</p>
          <div className="mt-3 space-y-1">
            {courseNames.map((n, i) => (
              <p key={n} className="slam text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gold sm:text-6xl" style={d(1000 + i * 250)}>{n}</p>
            ))}
          </div>
          <p className="rise mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur" style={d(1500)}>
            <Sparkles size={16} className="text-gold" /> Starts with a {INTRO_LABEL}
          </p>
          <p className="rise mt-10 text-lg text-white/80" style={d(1800)}>Would you like to choose more courses, or continue?</p>
          <div className="rise mt-5 flex flex-wrap gap-3" style={d(2000)}>
            {status.availableCourses.length > 0 && (
              <Action variant="ghost" onClick={() => setSlide('courses')}><ArrowLeft size={18} /> Choose more courses</Action>
            )}
            <Action onClick={next}>Continue <ArrowRight size={18} /></Action>
          </div>
        </>
      );
      break;

    case 'courses':
      body = (
        <>
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-brand-soft" style={d(50)}>Go further</p>
          <h1 className="rise mt-4 text-4xl font-black tracking-tight sm:text-6xl" style={d(150)}>Pick more courses</h1>
          <p className="rise mt-3 text-white/85" style={d(250)}>
            {status.course?.name} stays your main track. Add as many as you like — you can take their knowledge checks too.
          </p>
          <div className="mt-6 grid max-h-[46vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2" data-noswipe>
            {status.availableCourses.map((c, i) => {
              const on = picked.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => { sfx.pop(); setPicked(p => (on ? p.filter(x => x !== c.id) : [...p, c.id])); }}
                  className={cx(
                    'pop flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                    on ? 'border-white bg-white text-black' : 'border-white/20 bg-white/5 hover:bg-white/10',
                  )}
                  style={d(300 + i * 70)}
                >
                  <span className={cx('inline-flex size-10 shrink-0 items-center justify-center rounded-xl', on ? 'bg-black text-white' : 'bg-white/10')}>
                    {on ? <Check size={18} /> : <Plus size={18} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold">{c.name}</span>
                    {c.level && <span className={cx('text-xs', on ? 'text-black/80' : 'text-white/85')}>{c.level}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Action variant="ghost" onClick={() => setSlide('enrolled')}><ArrowLeft size={18} /> Back</Action>
            <Action onClick={saveCourses} loading={savingCourses}>
              {picked.length ? `Add ${picked.length} course${picked.length === 1 ? '' : 's'}` : 'Skip'} <ArrowRight size={18} />
            </Action>
          </div>
        </>
      );
      break;

    case 'prizes':
      body = (
        <div className="relative">
          {[{ l: '68%', t: '-6%', r: '12deg', s: 54 }, { l: '86%', t: '30%', r: '-10deg', s: 38 }, { l: '74%', t: '62%', r: '8deg', s: 46 }].map((p, i) => (
            <Trophy key={i} size={p.s} className="float absolute hidden text-black/20 sm:block" style={{ left: p.l, top: p.t, '--r': p.r, '--d': `${i * 400}ms` } as CSSProperties} />
          ))}
          <p className="rise text-sm font-bold uppercase tracking-[0.3em] text-black/80" style={d(50)}>Your first challenge</p>
          <div className="mt-2 flex items-end gap-4">
            <span className="slam text-[9rem] font-black leading-none tracking-tighter text-black sm:text-[13rem]" style={d(200)}>7</span>
            <span className="rise mb-6 text-4xl font-black uppercase leading-none text-black sm:mb-10 sm:text-6xl" style={d(700)}>days</span>
          </div>
          <p className="rise text-2xl font-bold text-black sm:text-3xl" style={d(1000)}>of introduction.</p>
          <p className="pop mt-6 inline-flex items-center gap-3 rounded-full bg-black px-5 py-3 text-xl font-black text-gold sm:text-2xl" style={d(1500)}>
            <Trophy size={26} /> Prizes to be won
          </p>
          <p className="rise mt-6 max-w-md text-lg font-medium text-black/80" style={d(1900)}>
            Show up, learn, and climb the leaderboard — the top performers walk away with rewards.
          </p>
          <div className="rise mt-8" style={d(2200)}>
            <button type="button" onClick={next}
              className="inline-flex h-14 items-center gap-2 rounded-full bg-black px-7 text-base font-bold text-white transition-transform active:scale-95">
              I&apos;m in <ArrowRight size={18} />
            </button>
          </div>
        </div>
      );
      break;

    case 'profile':
      body = profileDone ? (
        <>
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-gold" style={d(50)}>Profile</p>
          <h1 className="rise mt-4 text-5xl font-black tracking-tight" style={d(150)}>You&apos;re all set.</h1>
          <p className="rise mt-4 text-xl text-white/80" style={d(300)}>
            Your profile earned you <span className="font-black text-gold">+{status.profileBonus ?? 0} points</span>.
          </p>
          {!status.user.gender && (
            <div className="rise mt-6 max-w-md" style={d(400)} data-noswipe>
              <GenderPicker value={gender} onPick={pickGender} />
            </div>
          )}
          <div className="rise mt-8" style={d(450)}>
            <Action
              loading={savingProfile}
              onClick={async () => {
                if (!status.user.gender && gender) {
                  const fd = new FormData();
                  fd.append('gender', gender);
                  setSavingProfile(true);
                  try { setStatus(await api<OnboardingStatus>('/v2/onboarding/profile', { form: fd })); } catch { /* anthem still plays locally */ }
                  setSavingProfile(false);
                }
                next();
              }}
            >
              Continue <ArrowRight size={18} />
            </Action>
          </div>
        </>
      ) : (
        <>
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-gold" style={d(50)}>Next up</p>
          <h1 className="rise mt-3 text-4xl font-black tracking-tight sm:text-6xl" style={d(150)}>Create your profile</h1>
          <div className="rise mt-5 flex flex-wrap gap-2" style={d(300)}>
            <span className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-black text-black">
              <Trophy size={16} /> First 10 get 200 points
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">Everyone else gets 150</span>
          </div>
          <p className="rise mt-3 text-sm text-white/85" style={d(400)}>
            {status.earlyBirdSlotsLeft > 0
              ? `🔥 ${status.earlyBirdSlotsLeft} early-bird spot${status.earlyBirdSlotsLeft === 1 ? '' : 's'} left — be quick.`
              : 'Early-bird spots are gone — 150 points are still waiting for you.'}
          </p>

          <div className="rise mt-6 flex flex-col gap-5 sm:flex-row sm:items-start" style={d(500)} data-noswipe>
            <label className={cx(
              'relative flex size-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors',
              image || status.user.imageUrl ? 'border-transparent' : 'border-white/40 hover:border-white',
            )}>
              {preview || status.user.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview / Cloudinary
                <img src={preview ?? status.user.imageUrl!} alt="Your photo" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs font-semibold text-white/85"><Camera size={26} /> Add photo</span>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { sfx.pop(); setImage(e.target.files?.[0] ?? null); }} />
            </label>
            <div className="flex-1 space-y-3">
              <GenderPicker value={gender} onPick={pickGender} />
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                aria-label="Full name"
                className="h-12 w-full rounded-2xl border border-white/20 bg-black/30 px-4 text-base text-white placeholder:text-white/55 outline-none focus:border-white"
              />
              {needsExpectation && (
                <textarea
                  value={expectation}
                  onChange={e => setExpectation(e.target.value)}
                  maxLength={600}
                  rows={3}
                  placeholder="What do you want to get out of Web3Nova?"
                  aria-label="What you hope to get from the course"
                  className="w-full resize-none rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-base text-white placeholder:text-white/55 outline-none focus:border-white"
                />
              )}
              {!status.uploadsEnabled && !status.user.imageUrl && (
                <p className="text-xs text-white/85">Photo uploads aren&apos;t switched on yet — you can add one later from your profile.</p>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Action variant="gold" onClick={saveProfile} loading={savingProfile}>Claim my points <ArrowRight size={18} /></Action>
          </div>
        </>
      );
      break;

    case 'bonus':
      body = (
        <div className="text-center">
          <Confetti />
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-white/80" style={d(50)}>Profile created</p>
          <p className="pop mt-4 text-[7rem] font-black leading-none tracking-tighter text-gold tabular-nums sm:text-[10rem]" style={d(200)}>
            +{bonusShown}
          </p>
          <p className="rise text-2xl font-black uppercase tracking-wide" style={d(500)}>points</p>
          <p className="rise mx-auto mt-6 max-w-md text-lg text-white/85" style={d(1200)}>
            {awarded?.points === 200
              ? `Early bird! You were #${awarded.rank} to create your profile — top 10.`
              : `You were #${awarded?.rank ?? '—'} to create your profile. A strong start.`}
          </p>
          <div className="rise mt-8 flex justify-center" style={d(1500)}><Action onClick={next}>Continue <ArrowRight size={18} /></Action></div>
        </div>
      );
      break;

    case 'welcome':
      body = (
        <>
          <div className="rise self-start" style={d(50)}>
            <Image src="/web3nova-logo-white.png" alt="Web3Nova" width={1200} height={359} className="h-10 w-auto object-contain sm:h-12" />
          </div>
          <h1 className="rise mt-10 text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl" style={d(300)}>
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gold">Web3Nova</span>.
          </h1>
          <p className="rise mt-8 text-2xl font-bold text-white/85 sm:text-4xl" style={d(1100)}>We don&apos;t just teach.</p>
          <p className="rise mt-2 text-3xl font-black sm:text-5xl" style={d(1700)}>
            We help you build a <span className="sweep text-gold" style={d(2100)}>career</span> from it.
          </p>
          <div className="rise mt-10" style={d(2600)}><Action onClick={next}>Show me how <ArrowRight size={18} /></Action></div>
        </>
      );
      break;

    case 'lbe': {
      const steps = [
        { word: 'Learn', icon: Lightbulb, text: 'Live classes, materials and recordings from builders.', color: 'text-brand-soft' },
        { word: 'Build', icon: Hammer, text: 'Ship real projects every week — your portfolio grows with you.', color: 'text-white' },
        { word: 'Earn', icon: Wallet, text: 'Turn your skills into gigs, jobs and prizes.', color: 'text-gold' },
      ];
      body = (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-[16%] -z-0 overflow-hidden opacity-10" aria-hidden>
            <div className="wrap-marquee text-[7rem] font-black uppercase leading-none whitespace-nowrap">
              {Array.from({ length: 2 }).map((_, k) => <span key={k} className="pr-8">Learn · Build · Earn · Learn · Build · Earn ·</span>)}
            </div>
          </div>
          <div className="relative space-y-6 sm:space-y-8">
            {steps.map((s, i) => (
              <div key={s.word} className="flex items-start gap-4 sm:gap-6">
                <span className="pop inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur sm:size-16" style={d(i * 900 + 100)}>
                  <s.icon size={30} className={s.color} />
                </span>
                <div>
                  <p className={cx('slam text-5xl font-black tracking-tight sm:text-7xl', s.color)} style={d(i * 900)}>{s.word}</p>
                  <p className="rise mt-1 max-w-md text-base text-white/85 sm:text-lg" style={d(i * 900 + 400)}>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rise mt-10 flex flex-wrap items-center gap-3" style={d(3000)}>
            <Action onClick={next}>Where do I stand? <ArrowRight size={18} /></Action>
            <span className="hidden items-center gap-3 text-white/85 sm:inline-flex"><Code2 size={18} /><Rocket size={18} /><Briefcase size={18} /><GraduationCap size={18} /></span>
          </div>
        </>
      );
      break;
    }

    case 'leaderboard': {
      const top = board?.entries.slice(0, 5) ?? [];
      const meInTop = top.some(e => e.id === status.user.id);
      body = (
        <>
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-gold" style={d(50)}>The leaderboard</p>
          {!board ? (
            <div className="mt-10 flex items-center gap-3 text-white/85"><Spinner className="text-white" /> Checking the standings…</div>
          ) : (
            <>
              <h1 className="rise mt-4 text-5xl font-black tracking-tight sm:text-7xl" style={d(150)}>
                {myEntry ? <>You&apos;re <span className="text-gold">#{myEntry.rank}</span></> : 'You’re on the board'}
              </h1>
              <p className="rise mt-3 text-lg text-white/85" style={d(350)}>
                {myEntry ? `with ${myEntry.points} points, out of ${board.total} students so far.` : 'Your points will show up here.'}
              </p>
              <ol className="mt-7 space-y-2" data-noswipe>
                {top.map((e, i) => (
                  <li key={e.id}
                    className={cx('rise flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur', e.id === status.user.id ? 'bg-gold text-black' : 'bg-white/10')}
                    style={d(500 + i * 120)}>
                    <span className="w-6 text-sm font-black tabular-nums">{e.rank}</span>
                    <Avatar name={e.name} src={e.imageUrl} size={34} />
                    <span className="min-w-0 flex-1 truncate font-bold">{e.id === status.user.id ? 'You' : e.name}</span>
                    <span className="font-black tabular-nums">{e.points}</span>
                  </li>
                ))}
                {myEntry && !meInTop && (
                  <li className="rise flex items-center gap-3 rounded-2xl bg-gold px-4 py-3 text-black" style={d(1200)}>
                    <span className="w-6 text-sm font-black tabular-nums">{myEntry.rank}</span>
                    <Avatar name={myEntry.name} src={myEntry.imageUrl} size={34} />
                    <span className="flex-1 font-bold">You</span>
                    <span className="font-black tabular-nums">{myEntry.points}</span>
                  </li>
                )}
              </ol>
              <div className="rise mt-8" style={d(1400)}><Action onClick={next}>What&apos;s next? <ArrowRight size={18} /></Action></div>
            </>
          )}
        </>
      );
      break;
    }

    case 'invite': {
      const sent = invite.state === 'PENDING' || invite.state === 'APPROVED';
      body = (
        <>
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-gold" style={d(50)}>Bonus mission</p>
          <h1 className="rise mt-3 text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl" style={d(150)}>
            Earn <span className="text-gold">+{INVITE_POINTS}</span> more points
          </h1>
          <p className="rise mt-3 max-w-lg text-lg text-white/85" style={d(300)}>
            Invite your friends to register for the Web3Nova <span className="font-black text-white">7-DAY BOOT CAMP</span>.
          </p>

          <ol className="mt-6 space-y-3" data-noswipe>
            <li className="rise flex items-start gap-3 rounded-2xl bg-black/30 p-4 backdrop-blur" style={d(450)}>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">1</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Go to the group and follow the instructions</p>
                <p className="mt-1 text-sm text-white/80">Invite your friends using the flier and link shared there.</p>
                <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-black text-black">
                  <ExternalLink size={16} /> Open WhatsApp group
                </a>
              </div>
            </li>
            <li className="rise flex items-start gap-3 rounded-2xl bg-black/30 p-4 backdrop-blur" style={d(600)}>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                {sent ? <Check size={16} /> : 2}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Submit proof</p>
                {sent ? (
                  <p className="mt-1 text-sm text-white/85">
                    {invite.state === 'APPROVED' ? `Approved — +${INVITE_POINTS} points added.` : `Sent! +${INVITE_POINTS} points land when an admin approves it.`}
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-bold">
                      <Camera size={16} /> {invite.file ? invite.file.name.slice(0, 18) : 'Add screenshot'}
                      <input type="file" accept="image/*" className="sr-only" onChange={e => { sfx.pop(); invite.setFile(e.target.files?.[0] ?? null); }} />
                    </label>
                    <button type="button" disabled={!invite.file || invite.submitting}
                      onClick={async () => { if (await invite.submit()) sfx.win(); }}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-black text-black disabled:opacity-50">
                      {invite.submitting ? <Spinner size={16} className="text-black" /> : <UploadCloud size={16} />} Submit proof
                    </button>
                  </div>
                )}
                {invite.error && <p role="alert" className="mt-2 text-sm font-semibold text-red-300">{invite.error}</p>}
              </div>
            </li>
          </ol>

          <div className="rise mt-6 flex flex-wrap gap-3" style={d(900)}>
            <Action onClick={next}>{sent ? 'Continue' : 'I’ll do it later'} <ArrowRight size={18} /></Action>
          </div>
        </>
      );
      break;
    }

    case 'comeback':
      body = (
        <div className="text-center">
          <p className="rise text-sm font-semibold uppercase tracking-[0.3em] text-gold" style={d(50)}>See you tomorrow</p>
          <h1 className="rise mx-auto mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl" style={d(200)}>
            Come back in 24 hours for your Knowledge Check.
          </h1>
          <div className="pop mx-auto mt-10 w-fit" style={d(700)}>
            <div className="ring-pulse inline-flex flex-col items-center rounded-3xl border border-white/25 bg-white/10 px-10 py-6 backdrop-blur">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/85">Knowledge Check unlocks in</span>
              <span className="mt-2 text-5xl font-black tabular-nums sm:text-6xl">
                {countdown ? `${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}` : '24:00:00'}
              </span>
            </div>
          </div>
          <p className="pop mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-lg font-black text-black" style={d(1000)}>
            <Trophy size={20} /> There will be rewards
          </p>
          <p className="rise mx-auto mt-6 max-w-md text-lg text-white/85" style={d(1200)}>
            It tests what you know about {status.course?.name ?? 'your course'}. Your score is added to your points — ace it to climb the leaderboard and win.
          </p>
          <div className="rise mt-8 flex flex-wrap justify-center gap-3" style={d(1400)}>
            <Action variant="ghost" onClick={() => router.push('/student/leaderboard')}><Trophy size={18} /> Full leaderboard</Action>
            <Action onClick={() => router.push('/student')} disabled={!status.onboardedAt}>Go to my dashboard <ArrowRight size={18} /></Action>
          </div>
        </div>
      );
      break;
  }

  return (
    <div
      className="wrap-root"
      style={{ '--wrap-bg': theme.bg, '--wrap-a': theme.a, '--wrap-b': theme.b, '--wrap-c': theme.c } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { start.current = null; }}
    >
      <div className="wrap-blob wrap-blob--a" />
      <div className="wrap-blob wrap-blob--b" />
      <div className="wrap-blob wrap-blob--c" />
      {theme.scrim && <div className="wrap-scrim" />}
      <div className="wrap-grain" />

      <div className="relative z-10 mx-auto flex h-full max-w-3xl flex-col px-5 pt-5 sm:px-8 sm:pt-8">
        <div className="wrap-progress" aria-label={`Step ${segIndex + 1} of ${SEGMENTS.length}`}>
          {SEGMENTS.map((s, i) => (
            <span key={s} className={cx(i < segIndex && 'is-done', i === segIndex && 'is-current')}><i /></span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-white/85">
          <span>Web3Nova · Welcome</span>
          <span className="flex items-center gap-4">
            {slide !== 'enrolled' && slide !== 'comeback' && (
              <button type="button" onClick={back} className="inline-flex items-center gap-1 hover:text-white"><ArrowLeft size={14} /> Back</button>
            )}
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={!muted}
              className="inline-flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </span>
        </div>

        <main key={slide} className="flex flex-1 flex-col justify-center overflow-y-auto py-8" aria-live="polite">
          {body}
          {error && (
            <p role="alert" className="mt-5 max-w-md rounded-2xl bg-black/50 px-4 py-3 text-sm font-semibold text-red-300 backdrop-blur">{error}</p>
          )}
        </main>

        {slide === 'enrolled' && (
          <p className="pb-6 text-center text-xs font-semibold text-white/85">
            <span className="swipe-hint inline-block" style={{ '--nx': '-8px' } as CSSProperties}>←</span> swipe for more courses ·
            continue <span className="swipe-hint inline-block">→</span>
          </p>
        )}
      </div>
    </div>
  );
}
