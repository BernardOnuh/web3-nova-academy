// app/not-found.tsx
import Link from 'next/link';
import StatusPage from '@/components/status-page';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <StatusPage code="404" title="Page not found" description="The page you're looking for doesn't exist or has moved.">
      <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
        Go home
      </Link>
      <Link href="/login" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-semibold text-gray-100 hover:bg-line">
        Sign in
      </Link>
    </StatusPage>
  );
}
