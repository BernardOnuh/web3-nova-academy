// app/login/page.tsx
"use client";

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, AtSign, Lock, Mail } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { getSession, homeFor, saveSession } from '@/lib/session';
import LeaderboardCarousel from '@/components/leaderboard-carousel';
import LiquidBackground, { splash } from '@/components/liquid-background';

type Mode = 'v2' | 'v1';
interface LoginResponse { token: string; user: { role: string } }

/** only allow same-site relative redirects */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));

  const [mode, setMode] = useState<Mode>('v2');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // already signed in → skip the form
  useEffect(() => {
    const s = getSession();
    if (s) router.replace(next ?? homeFor(s.role));
  }, [router, next]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data =
        mode === 'v2'
          ? await api<LoginResponse>('/v2/auth/login', { body: { studentName: identifier.trim().toLowerCase(), password }, auth: false })
          : await api<LoginResponse>('/auth/login', { body: { email: identifier.trim(), password }, auth: false });
      saveSession(data.token, data.user.role);
      const home = homeFor(data.user.role);
      router.push(next && next.startsWith(home) ? next : home);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="liquid-card relative z-10 w-full max-w-md rounded-3xl p-8 sm:p-10">
      <div className="mb-8 text-center">
        <Link href="/">
          <Image
            src="/web3nova-logo-white.png"
            alt="Web3Nova"
            width={1200}
            height={359}
            preload
            className="mx-auto mb-5 h-12 w-auto drop-shadow-[0_0_18px_rgba(35,137,219,0.55)]"
          />
        </Link>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold">Academy Portal</p>
        <p className="text-sm text-gray-200">Sign in to access your learning portal</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle size={18} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1" role="tablist">
        {([['v2', 'Intake student'], ['v1', 'Staff & email']] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(''); setIdentifier(''); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? 'bg-brand text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-white">
            {mode === 'v2' ? 'Username' : 'Email address'}
          </label>
          <div className="liquid-input">
            {mode === 'v2' ? <AtSign size={18} className="shrink-0 text-gray-400" /> : <Mail size={18} className="shrink-0 text-gray-400" />}
            <input
              id="identifier"
              type={mode === 'v2' ? 'text' : 'email'}
              autoComplete="username"
              autoCapitalize="none"
              required
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); splash(e.currentTarget); }}
              className="w-full bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
              placeholder={mode === 'v2' ? 'e.g. ada.obi' : 'you@web3nova.org'}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white">Password</label>
          <div className="liquid-input">
            <Lock size={18} className="shrink-0 text-gray-400" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => { setPassword(e.target.value); splash(e.currentTarget); }}
              className="w-full bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          {mode === 'v1' && (
            <p className="mt-2 text-xs text-gray-400">First-time login? Your password is your first name, lowercase.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="liquid-button mt-2 w-full rounded-xl py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="liquid-button__wave" aria-hidden="true" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? 'Signing in…' : <>Sign in <ArrowRight size={18} /></>}
          </span>
        </button>
      </form>

      {mode === 'v2' && (
        <p className="mt-6 text-center text-sm text-gray-400">
          New to the intake?{' '}
          <Link href="/register" className="font-semibold text-brand-soft hover:text-white">Create your account</Link>
        </p>
      )}

      <div className="mt-6 border-t border-white/10 pt-6">
        <LeaderboardCarousel compact />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LiquidBackground>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </LiquidBackground>
  );
}
