// app/page.tsx — landing
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, GraduationCap, Trophy, UserPlus } from 'lucide-react';
import LeaderboardCarousel from '@/components/leaderboard-carousel';
import LiquidBackground from '@/components/liquid-background';

export default function Home() {
  return (
    <LiquidBackground>
      <div className="liquid-card relative z-10 w-full max-w-lg rounded-3xl p-8 sm:p-10">
        <div className="mb-6 text-center">
          <Image
            src="/web3nova-logo-white.png"
            alt="Web3Nova"
            width={1200}
            height={359}
            preload
            className="mx-auto mb-4 h-12 w-auto drop-shadow-[0_0_18px_rgba(35,137,219,0.55)]"
          />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold">Academy Portal</p>
          <h1 className="text-2xl font-bold text-white">Track the leaderboard, then sign in to take your knowledge check.</h1>
        </div>

        <LeaderboardCarousel limit={6} />

        <div className="mt-8 space-y-3">
          <Link href="/login" className="liquid-button flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white">
            <span className="liquid-button__wave" aria-hidden="true" />
            <span className="relative z-10 flex items-center gap-2">
              Sign in to your course <ArrowRight size={18} />
            </span>
          </Link>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { href: '/register', label: 'Join intake', icon: UserPlus },
              { href: '/courses', label: 'Courses', icon: GraduationCap },
              { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
            ].map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-brand/40 hover:text-white"
              >
                <l.icon size={16} /> {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </LiquidBackground>
  );
}
