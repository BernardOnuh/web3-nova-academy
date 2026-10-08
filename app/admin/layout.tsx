// app/admin/layout.tsx — super admin (courseId null) and course admin (courseId set) share this shell
"use client";

import { BookOpen, ClipboardList, Gift, Layers, LayoutDashboard, UserPlus, Users } from 'lucide-react';
import AppShell, { type NavSection } from '@/components/app-shell';
import { isSuperAdmin, type Session } from '@/lib/session';

function nav(session: Session): NavSection[] {
  if (isSuperAdmin(session)) {
    return [
      { items: [{ label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true }] },
      {
        title: 'Academy',
        items: [
          { label: 'Cohorts', href: '/admin/cohorts', icon: Layers },
          { label: 'Courses', href: '/admin/courses', icon: BookOpen },
          { label: 'Knowledge Checks', href: '/admin/tests', icon: ClipboardList },
        ],
      },
      {
        title: 'People',
        items: [
          { label: 'Students', href: '/admin/students', icon: Users },
          { label: 'Invite proofs', href: '/admin/proofs', icon: Gift },
          { label: 'Tutors', href: '/admin/tutors', icon: UserPlus },
        ],
      },
    ];
  }
  return [
    {
      items: [
        { label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
        { label: 'My course', href: `/admin/courses/${session.courseId}`, icon: BookOpen },
        { label: 'Knowledge Checks', href: '/admin/tests', icon: ClipboardList },
        { label: 'Students', href: '/admin/students', icon: Users },
        { label: 'Invite proofs', href: '/admin/proofs', icon: Gift },
      ],
    },
  ];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell roles={['ADMIN', 'TUTOR']} badge={s => (isSuperAdmin(s) ? 'Super Admin' : 'Course Admin')} nav={nav}>
      {children}
    </AppShell>
  );
}
