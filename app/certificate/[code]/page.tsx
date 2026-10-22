// app/certificate/[code]/page.tsx — public, printable certificate (GET /v2/exams/certificates/:code)
"use client";

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Award, Copy, Download, ShieldCheck } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/format';
import type { PublicCertificate } from '@/lib/types';
import { useFeedback } from '@/components/feedback';
import PublicShell from '@/components/public-shell';
import { Button, Card, DataState, EmptyState } from '@/components/ui';

export default function CertificatePage() {
  const { code } = useParams<{ code: string }>();
  const { toast } = useFeedback();
  const cert = useApi<PublicCertificate>(`/v2/exams/certificates/${encodeURIComponent(code)}`, { auth: false });
  const c = cert.data;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Certificate link copied');
    } catch {
      toast('Copy failed — copy the address bar instead', 'error');
    }
  };

  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;

  return (
    <PublicShell>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: #fff !important; }
          body * { visibility: hidden; }
          #certificate, #certificate * { visibility: visible; }
          #certificate { position: fixed; inset: 0; margin: 0; border-radius: 0; box-shadow: none; }
        }
      `}</style>

      <DataState loading={cert.loading} error={null}>
        {cert.error || !c ? (
          <Card padded={false}>
            <EmptyState icon={ShieldCheck} title="Certificate not found" description={`No Web3Nova certificate has the ID ${code}.`} />
          </Card>
        ) : (
          <>
            <div
              id="certificate"
              className="relative mx-auto aspect-[1.414] w-full max-w-4xl overflow-hidden rounded-2xl bg-[#FBF8F1] text-[#0B1B33] shadow-2xl"
            >
              <div className="absolute inset-[3%] rounded-xl border-2 border-[#C9971F]/70" />
              <div className="absolute inset-[4.2%] rounded-lg border border-[#C9971F]/35" />

              <div className="relative flex h-full flex-col items-center px-[8%] pt-[5%] pb-[5%] text-center">
                <div className="rounded-lg bg-[#0B1B33] px-[3%] py-[1.4%]">
                  <Image src="/web3nova-logo-white.png" alt="Web3Nova" width={1200} height={359} className="h-[clamp(18px,4vw,36px)] w-auto" preload />
                </div>

                <p className="mt-[4%] text-[clamp(9px,1.5vw,14px)] font-semibold uppercase tracking-[0.35em] text-[#C9971F]">Certificate of Completion</p>
                <p className="mt-[2.5%] text-[clamp(9px,1.4vw,14px)] text-[#4A5568]">This certifies that</p>
                <p className="mt-[1.5%] font-serif text-[clamp(22px,5.2vw,52px)] font-bold leading-tight">{c.name}</p>
                <div className="mt-[1%] h-px w-1/2 bg-[#C9971F]/60" />
                <p className="mt-[2.5%] max-w-[80%] text-[clamp(9px,1.5vw,15px)] leading-relaxed text-[#4A5568]">
                  has successfully completed the final test and practical assessment for
                </p>
                <p className="mt-[1.5%] text-[clamp(14px,3vw,30px)] font-bold text-[#1F6FD6]">{c.course}</p>
                {c.cohort && <p className="mt-[1%] text-[clamp(8px,1.3vw,13px)] text-[#4A5568]">Web3Nova Academy · {c.cohort}</p>}

                <div className="mt-auto flex w-full items-end justify-between text-[clamp(7px,1.15vw,12px)] text-[#4A5568]">
                  <div className="text-left">
                    <p className="font-semibold text-[#0B1B33]">{formatDate(c.issuedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p>Date issued</p>
                  </div>
                  <span className="inline-flex size-[clamp(36px,8vw,76px)] items-center justify-center rounded-full bg-[#C9971F] text-white shadow-inner">
                    <Award className="size-1/2" />
                  </span>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-[#0B1B33]">{c.code}</p>
                    <p>Certificate ID</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 flex max-w-4xl flex-col items-center gap-4">
              <p className="inline-flex items-center gap-2 text-sm text-success">
                <ShieldCheck size={16} /> Verified Web3Nova certificate, issued {formatDate(c.issuedAt)}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="gold" icon={Download} onClick={() => window.print()}>Download PDF</Button>
                <Button variant="secondary" icon={Copy} onClick={copyLink}>Copy link</Button>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-semibold text-gray-100 hover:bg-line"
                >
                  Share on LinkedIn
                </a>
                <a
                  href={`https://x.com/intent/post?text=${encodeURIComponent(`I just earned my ${c.course} certificate from @Web3Nova!`)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-semibold text-gray-100 hover:bg-line"
                >
                  Share on X
                </a>
              </div>
              <p className="text-xs text-faint">Tip: in the print dialog choose “Save as PDF”, landscape, and turn on background graphics.</p>
            </div>
          </>
        )}
      </DataState>
    </PublicShell>
  );
}
