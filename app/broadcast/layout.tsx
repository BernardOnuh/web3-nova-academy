// app/broadcast/layout.tsx — keep the team's WhatsApp broadcast page out of search engines
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broadcast',
  robots: { index: false, follow: false },
};

export default function BroadcastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
