// app/student/invite/page.tsx — invite friends to the boot camp for +100 points
"use client";

import { CheckCircle2, Clock, ExternalLink, Gift, UploadCloud } from 'lucide-react';
import { useInviteTask } from '@/lib/use-invite-task';
import { BOOTCAMP_NAME, INVITE_POINTS, WHATSAPP_GROUP_URL } from '@/lib/programme';
import { formatDateTime } from '@/lib/format';
import { Alert, Badge, Button, Card, DataState, FileInput, PageHeader } from '@/components/ui';

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <Card className="flex gap-4">
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-success text-black' : 'bg-brand/15 text-brand-soft'}`}>
        {done ? <CheckCircle2 size={18} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{title}</p>
        <div className="mt-2 text-sm text-muted">{children}</div>
      </div>
    </Card>
  );
}

export default function InvitePage() {
  const t = useInviteTask();
  const latest = t.status.data?.latest;

  return (
    <>
      <PageHeader
        eyebrow={`+${INVITE_POINTS} points`}
        title="Invite your friends"
        description={`Get friends to register for the ${BOOTCAMP_NAME}. Follow the instructions in the group, then send proof.`}
      />

      <DataState loading={t.status.loading} error={t.status.error} onRetry={t.status.reload}>
        {t.state === 'APPROVED' && (
          <Alert tone="success" className="mb-6">You earned +{latest?.points ?? INVITE_POINTS} points for inviting friends. Thank you!</Alert>
        )}
        {t.state === 'PENDING' && (
          <Alert tone="info" className="mb-6">
            Proof sent {formatDateTime(latest?.createdAt)} — an admin will check it soon. Points are added once it&apos;s approved.
          </Alert>
        )}
        {t.state === 'REJECTED' && (
          <Alert tone="warning" className="mb-6">
            Your last proof wasn&apos;t accepted{latest?.reviewNote ? `: “${latest.reviewNote}”` : '.'} You can send a new one below.
          </Alert>
        )}

        <div className="space-y-3">
          <Step n={1} title="Go to the WhatsApp group and follow the instructions">
            <p>The boot camp flier, link and steps for inviting friends are in the group.</p>
            <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-black hover:brightness-95">
              <ExternalLink size={16} /> Open the group
            </a>
          </Step>
          <Step n={2} title="Send a screenshot as proof" done={t.state === 'APPROVED'}>
            {t.canSubmit ? (
              <div className="space-y-3">
                <p>A screenshot of your shared status or chat works.</p>
                <FileInput accept="image/*" file={t.file} onChange={e => t.setFile(e.target.files?.[0] ?? null)} />
                {t.error && <Alert onDismiss={() => t.setError(null)}>{t.error}</Alert>}
                <Button icon={UploadCloud} loading={t.submitting} onClick={t.submit}>Submit proof</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary proof */}
                {latest && <img src={latest.imageUrl} alt="Your proof" className="h-20 w-20 rounded-lg border border-line object-cover" />}
                <Badge tone={t.state === 'APPROVED' ? 'success' : 'brand'}>
                  {t.state === 'APPROVED' ? <><CheckCircle2 size={12} /> Approved</> : <><Clock size={12} /> Waiting for review</>}
                </Badge>
              </div>
            )}
          </Step>
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-faint">
          <Gift size={14} /> One reward per student. Fake or reused screenshots are rejected.
        </p>
      </DataState>
    </>
  );
}
