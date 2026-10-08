// app/student/layout.tsx
"use client";

import {
  BookOpen, CheckSquare, Clock, FileText, Gift, GraduationCap, LayoutDashboard, Target, Trophy, UserCircle,
} from 'lucide-react';
import AppShell, { type NavSection } from '@/components/app-shell';
import OnboardingGate from '@/components/onboarding-gate';

const NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/student', icon: LayoutDashboard, exact: true },
      { label: 'Knowledge Check', href: '/student/diagnostic', icon: Target },
      { label: 'Library', href: '/student/materials', icon: BookOpen },
      { label: 'Leaderboard', href: '/student/leaderboard', icon: Trophy },
      { label: 'Invite & earn', href: '/student/invite', icon: Gift },
    ],
  },
  {
    title: 'Coursework',
    items: [
      { label: 'Attendance', href: '/student/attendance', icon: Clock },
      { label: 'Assignments', href: '/student/assignments', icon: CheckSquare },
      { label: 'Assessments', href: '/student/assessments', icon: FileText },
      { label: 'Grades', href: '/student/grades', icon: GraduationCap },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'Profile', href: '/student/profile', icon: UserCircle }],
  },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell roles={['STUDENT']} badge="Student Portal" nav={() => NAV}>
      <OnboardingGate>{children}</OnboardingGate>
    </AppShell>
  );
}
