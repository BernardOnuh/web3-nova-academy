// app/register/page.tsx — V2 intake self-enrolment (POST /v2/auth/register)
"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, AtSign, Camera, Check, Clock, GraduationCap, Lock, Mail, User } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { saveSession } from '@/lib/session';
import { useApi } from '@/lib/use-api';
import type { Course, PublicUser } from '@/lib/types';
import { INTRO_LABEL, SCHEDULE_TBD } from '@/lib/programme';
import LiquidBackground from '@/components/liquid-background';
import { Alert, Badge, Button, EmptyState, Input, PageLoader, Textarea, cx } from '@/components/ui';

const STUDENT_NAME_RE = /^[a-z0-9][a-z0-9._]{2,29}$/;
const MAX_IMAGE = 5 * 1024 * 1024;

interface Catalogue { cohort: { id: string; name: string } | null; courses: Course[] }

function validate(f: FormState) {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!STUDENT_NAME_RE.test(f.studentName)) e.studentName = '3–30 characters: lowercase letters, numbers, dot or underscore.';
  if (f.password.length < 6) e.password = 'At least 6 characters.';
  else if (f.password.length > 72) e.password = 'At most 72 characters.';
  if (f.confirm !== f.password) e.confirm = "Passwords don't match.";
  const exp = f.expectation.trim().length;
  if (exp < 10) e.expectation = 'Tell us a bit more (at least 10 characters).';
  else if (exp > 600) e.expectation = 'Keep it under 600 characters.';
  if (!f.image) e.image = 'A profile photo is required.';
  else if (f.image.size > MAX_IMAGE) e.image = 'Photo must be 5MB or smaller.';
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email or leave it blank.';
  return e;
}

interface FormState {
  fullName: string;
  studentName: string;
  email: string;
  password: string;
  confirm: string;
  expectation: string;
  image: File | null;
}

function RegisterFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const catalogue = useApi<Catalogue>('/v2/courses', { auth: false });

  const [courseId, setCourseId] = useState<string>(params.get('course') ?? '');
  const [requestedStep, setStep] = useState<1 | 2>(params.get('course') ? 2 : 1);
  const [form, setForm] = useState<FormState>({ fullName: '', studentName: '', email: '', password: '', confirm: '', expectation: '', image: null });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => (form.image ? URL.createObjectURL(form.image) : null), [form.image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const courses = catalogue.data?.courses ?? [];
  const course = courses.find(c => c.id === courseId);
  const errors = touched ? validate(form) : {};
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  // ?course= pointing at an unknown course → stay on step 1
  const step: 1 | 2 = requestedStep === 2 && catalogue.data && !course ? 1 : requestedStep;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validate(form)).length) return;
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append('studentName', form.studentName);
    fd.append('password', form.password);
    fd.append('expectation', form.expectation.trim());
    fd.append('courseId', courseId);
    if (catalogue.data?.cohort) fd.append('cohortId', catalogue.data.cohort.id);
    if (form.fullName.trim()) fd.append('fullName', form.fullName.trim());
    if (form.email.trim()) fd.append('email', form.email.trim());
    fd.append('image', form.image!);

    try {
      const res = await api<{ token: string; user: PublicUser }>('/v2/auth/register', { form: fd, auth: false });
      saveSession(res.token, res.user.role);
      router.push('/student');
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="liquid-card relative z-10 w-full max-w-2xl rounded-3xl p-6 sm:p-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/"><Image src="/web3nova-logo-white.png" alt="Web3Nova" width={1200} height={359} className="h-9 w-auto" preload /></Link>
        <ol className="flex items-center gap-2 text-xs font-medium" aria-label="Progress">
          {['Course', 'Account'].map((label, i) => {
            const n = (i + 1) as 1 | 2;
            const done = step > n;
            return (
              <li key={label} className={cx('flex items-center gap-1.5', step === n ? 'text-white' : 'text-faint')}>
                <span className={cx('inline-flex size-6 items-center justify-center rounded-full border text-[11px]',
                  done ? 'border-brand bg-brand text-white' : step === n ? 'border-brand text-brand-soft' : 'border-line')}>
                  {done ? <Check size={12} /> : n}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {step === 1 ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{catalogue.data?.cohort?.name ?? 'Join the intake'}</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Choose your course</h1>
          <p className="mt-1 text-sm text-muted">Pick the track you want to join. Every track opens with a {INTRO_LABEL}; {SCHEDULE_TBD.toLowerCase()}.</p>

          <div className="mt-6">
            {catalogue.loading ? (
              <PageLoader label="Loading courses…" />
            ) : catalogue.error ? (
              <Alert>{catalogue.error}</Alert>
            ) : courses.length === 0 ? (
              <EmptyState icon={GraduationCap} title="No open intake right now" description="Registration opens when the next intake is announced." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
                {courses.map(c => {
                  const selected = c.id === courseId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setCourseId(c.id)}
                      className={cx(
                        'rounded-2xl border p-4 text-left transition-colors',
                        selected ? 'border-brand bg-brand/10' : 'border-line bg-ink/50 hover:border-line-strong',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-white">{c.name}</p>
                        <span className={cx('mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-brand bg-brand text-white' : 'border-line-strong')}>
                          {selected && <Check size={12} />}
                        </span>
                      </div>
                      {c.description && <p className="mt-1.5 text-sm text-muted line-clamp-2">{c.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.level && <Badge tone="brand">{c.level}</Badge>}
                        <Badge><Clock size={11} /> {INTRO_LABEL}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted">Already enrolled? <Link href="/login" className="font-semibold text-brand-soft hover:text-white">Sign in</Link></p>
            <Button size="lg" disabled={!course} onClick={() => setStep(2)} className="w-full sm:w-auto">
              Continue <ArrowRight size={16} />
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <button type="button" onClick={() => setStep(1)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-white">
            <ArrowLeft size={14} /> {course ? course.name : 'Change course'}
          </button>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Your username is how you sign in and how you appear to classmates.</p>

          {error && <Alert className="mt-6" onDismiss={() => setError(null)}>{error}</Alert>}

          <div className="mt-6 flex flex-col gap-6 sm:flex-row">
            {/* avatar */}
            <div className="flex flex-col items-center gap-2 sm:w-36">
              <label
                className={cx(
                  'relative flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors',
                  errors.image ? 'border-danger' : 'border-line-strong hover:border-brand',
                )}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img src={preview} alt="Your photo" className="size-full object-cover" />
                ) : (
                  <Camera size={28} className="text-faint" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={e => set('image', e.target.files?.[0] ?? null)}
                />
              </label>
              <span className="text-xs text-muted">{form.image ? 'Change photo' : 'Add a photo'}</span>
              {errors.image && <span className="text-center text-xs text-danger">{errors.image}</span>}
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" icon={User} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Ada Obi" autoComplete="name" />
              <Input
                label="Username"
                icon={AtSign}
                value={form.studentName}
                onChange={e => set('studentName', e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="ada.obi"
                autoComplete="username"
                autoCapitalize="none"
                error={errors.studentName}
                hint="Lowercase, numbers, . or _"
              />
              <Input label="Email (optional)" icon={Mail} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" autoComplete="email" error={errors.email} wrapperClassName="sm:col-span-2" />
              <Input label="Password" icon={Lock} type="password" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" error={errors.password} hint="6–72 characters" />
              <Input label="Confirm password" icon={Lock} type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} autoComplete="new-password" error={errors.confirm} />
            </div>
          </div>

          <Textarea
            wrapperClassName="mt-4"
            label="What do you hope to get from this course?"
            value={form.expectation}
            onChange={e => set('expectation', e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="e.g. I want to build and deploy my first smart contract…"
            error={errors.expectation}
            hint={`${form.expectation.trim().length}/600`}
          />

          <Button type="submit" size="lg" loading={submitting} className="mt-6 w-full">
            {submitting ? 'Creating your account…' : 'Create account'}
          </Button>
          <p className="mt-4 text-center text-sm text-muted">
            Already enrolled? <Link href="/login" className="font-semibold text-brand-soft hover:text-white">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <LiquidBackground>
      <Suspense fallback={null}>
        <RegisterFlow />
      </Suspense>
    </LiquidBackground>
  );
}
