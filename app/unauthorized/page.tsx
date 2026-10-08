// app/unauthorized/page.tsx — shown when a signed-in user opens a route outside their role
"use client";

import StatusPage from '@/components/status-page';
import { Button, ButtonLink } from '@/components/ui';
import { homeFor, logout } from '@/lib/session';
import { useSession } from '@/lib/use-session';

export default function UnauthorizedPage() {
  const session = useSession();
  const home = session ? homeFor(session.role) : null;

  return (
    <StatusPage code="403" title="You don't have access to this page" description="Your account can't open this area of the portal.">
      {home && <ButtonLink href={home}>Back to my dashboard</ButtonLink>}
      <Button variant="secondary" onClick={logout}>Log out</Button>
    </StatusPage>
  );
}
