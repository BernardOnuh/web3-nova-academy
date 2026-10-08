// app/welcome/page.tsx — first-login welcome story for students
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/lib/use-session';
import type { OnboardingStatus } from '@/lib/types';
import WelcomeStory from '@/components/welcome/welcome-story';
import { Alert, Button, PageLoader } from '@/components/ui';

export default function WelcomePage() {
  const router = useRouter();
  const session = useSession();
  const isStudent = session?.role === 'STUDENT';
  const status = useApi<OnboardingStatus>(isStudent ? '/v2/onboarding' : null);
  const alreadyDone = !!status.data?.onboardedAt;

  useEffect(() => {
    if (session === undefined) return;
    if (!session) router.replace('/login?next=/welcome');
    else if (!isStudent) router.replace('/unauthorized');
    else if (alreadyDone) router.replace('/student');
  }, [session, isStudent, alreadyDone, router]);

  if (status.error) {
    return (
      <main className="app-glow flex min-h-dvh items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert>{status.error}</Alert>
          <Button onClick={status.reload}>Try again</Button>
        </div>
      </main>
    );
  }
  if (!status.data || alreadyDone) return <div className="min-h-dvh bg-ink"><PageLoader label="Getting things ready…" /></div>;

  return <WelcomeStory initial={status.data} />;
}
