// app/student/profile/page.tsx — view + edit profile (GET/PATCH /v2/auth/me)
"use client";

import { useEffect, useMemo, useState } from 'react';
import { Camera, KeyRound, Save, UserCircle } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/format';
import type { Profile, PublicUser } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { Avatar, Badge, Button, Card, CardHeader, DataState, Input, PageHeader, Textarea } from '@/components/ui';

const MAX_IMAGE = 5 * 1024 * 1024;

function DetailsCard({ profile, onSaved }: { profile: Profile; onSaved: (u: PublicUser) => void }) {
  const { toast } = useFeedback();
  const [fullName, setFullName] = useState(profile.name);
  const [expectation, setExpectation] = useState(profile.expectation ?? '');
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const p = profile;
  const dirty = fullName.trim() !== p.name || expectation.trim() !== (p.expectation ?? '') || !!image;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const exp = expectation.trim();
    if (!fullName.trim()) return setError('Full name cannot be empty.');
    if (exp !== (p.expectation ?? '') && (exp.length < 10 || exp.length > 600)) return setError('Expectation must be 10–600 characters.');
    if (image && image.size > MAX_IMAGE) return setError('Photo must be 5MB or smaller.');

    const fd = new FormData();
    if (fullName.trim() !== p.name) fd.append('fullName', fullName.trim());
    if (exp !== (p.expectation ?? '')) fd.append('expectation', exp);
    if (image) fd.append('image', image);

    setSaving(true);
    try {
      const { user } = await api<{ user: PublicUser }>('/v2/auth/me', { method: 'PATCH', form: fd });
      onSaved(user);
      setImage(null);
      toast('Profile updated');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Details" icon={UserCircle} />
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={p.name} src={preview ?? p.imageUrl} size={56} />
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-sm font-semibold text-gray-100 transition-colors hover:bg-line">
            <Camera size={16} /> {image ? 'Choose another' : 'Change photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setImage(e.target.files?.[0] ?? null)} />
          </label>
          {image && <Button variant="ghost" size="sm" onClick={() => setImage(null)}>Undo</Button>}
        </div>
        <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" />
        <Textarea
          label="What you hope to get from the course"
          value={expectation}
          onChange={e => setExpectation(e.target.value)}
          maxLength={600}
          rows={4}
          hint={`${expectation.trim().length}/600`}
        />
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <Button type="submit" icon={Save} loading={saving} disabled={!dirty}>Save changes</Button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { toast } = useFeedback();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6 || password.length > 72) return setError('Password must be 6–72 characters.');
    if (password !== confirm) return setError("Passwords don't match.");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('password', password);
      await api('/v2/auth/me', { method: 'PATCH', form: fd });
      setPassword('');
      setConfirm('');
      toast('Password changed');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Change password" icon={KeyRound} />
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="New password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" hint="6–72 characters" />
        <Input label="Confirm new password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
        {error && <p className="text-sm text-danger sm:col-span-2" role="alert">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" loading={saving} disabled={!password}>Update password</Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const profile = useApi<Profile>('/v2/auth/me');
  const p = profile.data;

  return (
    <>
      <PageHeader title="Profile" description="How you appear on the leaderboard and to your tutors." />

      <DataState loading={profile.loading} error={profile.error} onRetry={profile.reload}>
        {p && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="flex flex-col items-center text-center lg:self-start">
              <Avatar name={p.name} src={p.imageUrl} size={96} />
              <p className="mt-4 text-lg font-semibold text-white">{p.name}</p>
              {p.studentName && <p className="text-sm text-muted">@{p.studentName}</p>}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {p.course && <Badge tone="brand">{p.course.name}</Badge>}
                {p.cohort && <Badge tone="gold">{p.cohort.name}</Badge>}
              </div>
              <dl className="mt-6 grid w-full grid-cols-2 gap-3 border-t border-line pt-5 text-left text-sm">
                <div><dt className="text-faint">Points</dt><dd className="font-semibold text-gold tabular-nums">{p.points}</dd></div>
                <div><dt className="text-faint">Joined</dt><dd className="text-gray-200">{formatDate(p.createdAt)}</dd></div>
                <div className="col-span-2"><dt className="text-faint">Email</dt><dd className="truncate text-gray-200">{p.email}</dd></div>
              </dl>
            </Card>

            <div className="space-y-6 lg:col-span-2">
              <DetailsCard profile={p} onSaved={user => profile.setData(prev => ({ ...prev!, ...user }))} />
              <PasswordCard />
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}
