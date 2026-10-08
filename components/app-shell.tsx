// components/app-shell.tsx — responsive sidebar layout + role guard for /student and /admin
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { logout, type Role, type Session } from '@/lib/session';
import { useSession } from '@/lib/use-session';
import { PageLoader, cx } from './ui';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** match only the exact path (for dashboard roots) */
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

interface Props {
  roles: Role[];
  badge: string | ((session: Session) => string);
  nav: (session: Session) => NavSection[];
  children: ReactNode;
}

export default function AppShell({ roles, badge, nav, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  // the drawer remembers which page it was opened on, so navigating closes it
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const open = drawerPath === pathname;
  const setOpen = (v: boolean) => setDrawerPath(v ? pathname : null);

  const allowed = !!session && roles.includes(session.role);

  useEffect(() => {
    if (session === undefined) return; // still hydrating
    if (!session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!roles.includes(session.role)) router.replace('/unauthorized');
  }, [session, roles, router, pathname]);

  if (!session || !allowed) {
    return (
      <div className="min-h-dvh bg-ink">
        <PageLoader label="Checking your session…" />
      </div>
    );
  }

  const sections = nav(session);
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const who = session.studentName ? `@${session.studentName}` : session.email ?? 'Signed in';

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link href="/" className="block">
          <Image src="/web3nova-logo-white.png" alt="Web3Nova" width={1200} height={359} className="h-8 w-auto" preload />
        </Link>
        <button className="lg:hidden text-muted hover:text-white" aria-label="Close menu" onClick={() => setOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <div className="px-5 pb-4">
        <span className="inline-flex rounded-md border border-gold/25 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
          {typeof badge === 'function' ? badge(session) : badge}
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map(item => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active ? 'bg-brand/10 text-white' : 'text-muted hover:bg-white/[0.04] hover:text-gray-100',
                      )}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-brand" />}
                      <item.icon size={18} className={active ? 'text-brand-soft' : ''} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <p className="truncate px-3 pb-2 text-xs text-faint" title={who}>{who}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink text-gray-200">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface/80 backdrop-blur lg:block">{sidebar}</aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-surface animate-fade-up">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-ink/80 px-4 backdrop-blur lg:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-1.5 text-muted hover:text-white">
            <Menu size={22} />
          </button>
          <Image src="/web3nova-logo-white.png" alt="Web3Nova" width={1200} height={359} className="h-6 w-auto" />
        </header>

        <main className="app-glow min-h-dvh">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
