// app/broadcast/page.tsx — team WhatsApp broadcast: every student's login, split between senders.
// The roster is public/broadcast.enc.json (AES-GCM, built by cohort-portal/scripts/build-broadcast.js).
// Each sender's share is encrypted with a key derived (PBKDF2) from their own password, so a
// password unlocks only that person's list, and the public repo holds ciphertext only.
"use client";

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, KeyRound, Lock, MessageCircle, Search } from 'lucide-react';
import { Badge, Button, Card, Input, cx } from '@/components/ui';

interface Student {
  id: string;
  name: string;
  course: string | null;
  studentName: string;
  password: string | null;
  phone: string | null;
  rawPhone: string | null;
  sender: string;
}
interface Roster { generatedAt: string; portal: string; sender: string; students: Student[] }

const SENT_KEY = 'w3n-broadcast-sent';
const PASS_KEY = 'w3n-broadcast-pass';

function fromB64(s: string) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function loadRoster(password: string): Promise<Roster> {
  const res = await fetch('/broadcast.enc.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('The broadcast list has not been published yet.');
  const { iterations, groups } = (await res.json()) as { iterations: number; groups: { salt: string; iv: string; data: string }[] };
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  // a password only fits its owner's group; try each
  for (const g of groups) {
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: fromB64(g.salt), iterations, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
    );
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(g.iv) }, key, fromB64(g.data));
      return JSON.parse(new TextDecoder().decode(plain));
    } catch { /* not this group */ }
  }
  throw new Error('Wrong password.');
}

function messageFor(s: Student, portal: string) {
  const first = s.name.split(' ')[0];
  const password = s.password ?? 'the password you created when you registered';
  return [
    `Hi ${first}, from the Web3Nova Team 👋`,
    '',
    'You are to log in and perform this task within 24 hours:',
    '',
    `🔗 Portal: ${portal}/login`,
    `👤 Username: ${s.studentName}`,
    `🔑 Password: ${password}`,
    '',
    '✅ Complete the welcome tour and set up your profile',
    '✅ Go to the WhatsApp group and share the pinned post with your friends',
    '',
    'Access not used within 24 hours will be revoked.',
  ].join('\n');
}

function readSent(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function BroadcastPage() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [query, setQuery] = useState('');
  const [sent, setSent] = useState<Record<string, true>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const unlock = (pass: string) => {
    if (!pass.trim()) return;
    setUnlocking(true);
    setError(null);
    loadRoster(pass.trim())
      .then(r => {
        try { sessionStorage.setItem(PASS_KEY, pass.trim()); } catch { /* re-enter after reload */ }
        setRoster(r);
        setSent(readSent());
      })
      .catch(err => setError(err.message))
      .finally(() => setUnlocking(false));
  };

  // stay unlocked across reloads in the same tab
  useEffect(() => {
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(PASS_KEY); } catch { /* storage blocked */ }
    if (saved) unlock(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  const lock = () => {
    try { sessionStorage.removeItem(PASS_KEY); } catch { /* nothing saved */ }
    setRoster(null);
    setPassword('');
  };

  const markSent = (id: string, on = true) => {
    setSent(prev => {
      const next = { ...prev };
      if (on) next[id] = true;
      else delete next[id];
      try { localStorage.setItem(SENT_KEY, JSON.stringify(next)); } catch { /* progress just won't persist */ }
      return next;
    });
  };

  const copy = async (s: Student) => {
    if (!roster) return;
    try {
      await navigator.clipboard.writeText(messageFor(s, roster.portal));
      setCopied(s.id);
      setTimeout(() => setCopied(c => (c === s.id ? null : c)), 1500);
    } catch { /* clipboard blocked — WhatsApp button still works */ }
  };

  const mine = useMemo(() => roster?.students ?? [], [roster]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? mine.filter(s => `${s.name} ${s.studentName} ${s.rawPhone ?? ''}`.toLowerCase().includes(q)) : mine;
  }, [mine, query]);

  if (!roster) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm items-center px-4">
        <Card className="w-full">
          <form onSubmit={e => { e.preventDefault(); unlock(password); }} className="space-y-4 text-center">
            <KeyRound className="mx-auto text-gold" />
            <div>
              <h1 className="text-lg font-bold text-white">WhatsApp broadcast</h1>
              <p className="mt-1 text-sm text-muted">Enter your password to see your list.</p>
            </div>
            <Input icon={Lock} type="password" autoFocus placeholder="Your password" value={password}
              onChange={e => setPassword(e.target.value)} aria-label="Your password" aria-invalid={!!error} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" loading={unlocking} className="w-full">Unlock</Button>
          </form>
        </Card>
      </main>
    );
  }

  const doneCount = mine.filter(s => sent[s.id]).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">WhatsApp broadcast</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Hi {roster.sender}, {mine.length} students to message</h1>
        <button type="button" onClick={lock} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white">
          <Lock size={14} /> Lock
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Tap <span className="text-white">WhatsApp</span> on each row. It opens the chat with the message filled in;
        just press send. List built {new Date(roster.generatedAt).toLocaleString()}.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input icon={Search} placeholder="Search name, login or phone" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search" />
        </div>
        <div className="text-sm text-muted">
          <span className="font-semibold tabular-nums text-white">{doneCount}</span> / {mine.length} sent
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full bg-success transition-all" style={{ width: `${mine.length ? (doneCount / mine.length) * 100 : 0}%` }} />
      </div>

      <ul className="mt-5 space-y-2">
        {shown.map(s => {
          const isSent = !!sent[s.id];
          const wa = s.phone ? `https://wa.me/${s.phone}?text=${encodeURIComponent(messageFor(s, roster.portal))}` : null;
          return (
            <li key={s.id} className={cx('rounded-2xl border border-line bg-surface p-4 transition-opacity', isSent && 'opacity-55')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {s.course ?? 'No course'} · <span className="font-mono">{s.studentName}</span>
                    {s.password ? <> / <span className="font-mono">{s.password}</span></> : null}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {!s.password && <Badge tone="warning">Uses own password</Badge>}
                    {!s.phone && <Badge tone="danger">{s.rawPhone ? `Bad number: ${s.rawPhone}` : 'No phone on file'}</Badge>}
                    {isSent && <Badge tone="success"><Check size={12} /> Sent</Badge>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copy(s)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-sm text-gray-300 hover:border-brand/40 hover:text-white"
                  >
                    {copied === s.id ? <Check size={16} /> : <Copy size={16} />} {copied === s.id ? 'Copied' : 'Copy'}
                  </button>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markSent(s.id)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-black hover:brightness-95"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                  {isSent && (
                    <button type="button" onClick={() => markSent(s.id, false)} className="text-xs text-faint hover:text-gray-300">
                      Undo
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {!shown.length && <li className="py-10 text-center text-sm text-muted">No students match “{query}”.</li>}
      </ul>
    </main>
  );
}
