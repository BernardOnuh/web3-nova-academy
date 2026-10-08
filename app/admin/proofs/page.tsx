// app/admin/proofs/page.tsx — review "invite friends" proofs; approving adds the points
"use client";

import { useState } from 'react';
import { Check, Gift, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDateTime } from '@/lib/format';
import { INVITE_POINTS } from '@/lib/programme';
import type { AdminProof, ProofStatus } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import { Avatar, Badge, Button, Card, DataState, EmptyState, Input, Modal, PageHeader, Tabs } from '@/components/ui';

interface ProofList { pending: number; proofs: AdminProof[] }

const TONE = { PENDING: 'brand', APPROVED: 'success', REJECTED: 'danger' } as const;

export default function ProofsPage() {
  const { toast } = useFeedback();
  const [tab, setTab] = useState<ProofStatus>('PENDING');
  const list = useApi<ProofList>(`/v2/admin/proofs?status=${tab}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminProof | null>(null);
  const [reason, setReason] = useState('');
  const [zoom, setZoom] = useState<AdminProof | null>(null);

  const review = async (p: AdminProof, action: 'approve' | 'reject', note?: string) => {
    setBusy(p.id);
    try {
      await api(`/v2/admin/proofs/${p.id}`, { method: 'PATCH', body: { action, note } });
      list.setData(prev => ({ pending: Math.max(0, (prev?.pending ?? 1) - 1), proofs: (prev?.proofs ?? []).filter(x => x.id !== p.id) }));
      toast(action === 'approve' ? `+${INVITE_POINTS} points to ${p.student.name}` : `Rejected ${p.student.name}'s proof`);
      setRejecting(null);
      setZoom(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const proofs = list.data?.proofs ?? [];

  return (
    <>
      <PageHeader
        title="Invite proofs"
        description={`Students who shared the boot camp flier and link. Approving adds +${INVITE_POINTS} points (once per student).`}
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'PENDING', label: 'Pending', count: list.data?.pending },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'REJECTED', label: 'Rejected' },
        ]}
      />

      <DataState loading={list.loading} error={list.error} onRetry={list.reload}>
        {proofs.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon={Gift} title={tab === 'PENDING' ? 'Nothing to review' : `No ${tab.toLowerCase()} proofs`} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {proofs.map(p => (
              <Card key={p.id} padded={false} className="flex flex-col overflow-hidden">
                <button type="button" onClick={() => setZoom(p)} className="block bg-ink" aria-label={`View ${p.student.name}'s screenshot`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary screenshot */}
                  <img src={p.imageUrl} alt="" className="h-52 w-full object-cover object-top" />
                </button>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.student.name} src={p.student.imageUrl} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{p.student.name}</p>
                      <p className="truncate text-xs text-faint">
                        {p.student.studentName ? `@${p.student.studentName} · ` : ''}{p.student.studentCourse?.name ?? '—'}
                      </p>
                    </div>
                    <Badge tone={TONE[p.status]}>{p.status.toLowerCase()}</Badge>
                  </div>
                  {p.note && <p className="mt-3 text-sm text-muted">“{p.note}”</p>}
                  <p className="mt-2 text-xs text-faint">
                    Sent {formatDateTime(p.createdAt)}
                    {p.reviewedAt && ` · reviewed ${formatDateTime(p.reviewedAt)}${p.reviewedBy ? ` by ${p.reviewedBy.name}` : ''}`}
                  </p>
                  {p.reviewNote && <p className="mt-1 text-xs text-danger">Reason: {p.reviewNote}</p>}
                  {p.status === 'PENDING' && (
                    <div className="mt-auto flex gap-2 pt-4">
                      <Button variant="danger" size="sm" icon={X} disabled={busy === p.id} onClick={() => { setRejecting(p); setReason(''); }}>Reject</Button>
                      <Button size="sm" icon={Check} loading={busy === p.id} onClick={() => review(p, 'approve')} className="flex-1">
                        Approve +{INVITE_POINTS}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </DataState>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        size="sm"
        title="Reject this proof?"
        description="The student will see your reason and can send a new screenshot."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" loading={busy === rejecting?.id} onClick={() => rejecting && review(rejecting, 'reject', reason)}>Reject</Button>
          </>
        }
      >
        <Input label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Screenshot doesn't show the flier" autoFocus />
      </Modal>

      <Modal open={!!zoom} onClose={() => setZoom(null)} size="lg" title={zoom ? `${zoom.student.name}'s proof` : ''}
        footer={zoom?.status === 'PENDING' && (
          <>
            <Button variant="danger" icon={X} onClick={() => { setRejecting(zoom); setReason(''); setZoom(null); }}>Reject</Button>
            <Button icon={Check} loading={busy === zoom.id} onClick={() => review(zoom, 'approve')}>Approve +{INVITE_POINTS}</Button>
          </>
        )}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary screenshot */}
        {zoom && <img src={zoom.imageUrl} alt="Proof screenshot" className="mx-auto max-h-[70dvh] rounded-lg" />}
      </Modal>
    </>
  );
}
