// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { FeedbackProvider } from '@/components/feedback';
import "./globals.css";

export const metadata: Metadata = {
  title: { default: 'Web3Nova Academy', template: '%s · Web3Nova Academy' },
  description: 'Web3Nova Academy portal — courses, knowledge checks and the intake leaderboard.',
};

export const viewport: Viewport = {
  themeColor: '#08090D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
