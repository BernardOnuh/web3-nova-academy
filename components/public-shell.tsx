// components/public-shell.tsx — top nav + container for public pages (courses, leaderboard)
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from './ui';

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-glow min-h-dvh">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/"><Image src="/web3nova-logo-white.png" alt="Web3Nova" width={1200} height={359} className="h-8 w-auto" preload /></Link>
        <div className="flex gap-1 sm:gap-2">
          <ButtonLink href="/courses" variant="ghost" size="sm">Courses</ButtonLink>
          <ButtonLink href="/leaderboard" variant="ghost" size="sm">Leaderboard</ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="sm">Sign in</ButtonLink>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 animate-fade-up">{children}</div>
    </main>
  );
}
