// components/status-page.tsx — centered full-page message (404, unauthorized)
import Image from 'next/image';
import type { ReactNode } from 'react';

export default function StatusPage({ code, title, description, children }: { code: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="app-glow flex min-h-dvh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center sm:p-10">
        <Image src="/web3nova-logo-white.png" alt="Web3Nova" width={1200} height={359} className="mx-auto mb-8 h-9 w-auto" />
        <p className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-brand-soft to-gold">{code}</p>
        <h1 className="mt-4 text-xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </main>
  );
}
