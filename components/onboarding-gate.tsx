// components/onboarding-gate.tsx — students who haven't finished the welcome story are sent to /welcome
"use client";

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/use-api';
import type { OnboardingStatus } from '@/lib/types';
import { PageLoader } from './ui';

export default function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useApi<OnboardingStatus>('/v2/onboarding');
  const needsWelcome = !!status.data && !status.data.onboardedAt;

  useEffect(() => {
    if (needsWelcome) router.replace('/welcome');
  }, [needsWelcome, router]);

  // if the status call fails we let the student in rather than lock them out
  if (status.loading || needsWelcome) return <PageLoader label="Loading your portal…" />;
  return <>{children}</>;
}
