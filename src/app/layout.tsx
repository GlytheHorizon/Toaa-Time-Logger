import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import DonateBanner from '@/components/donate-banner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'Toaa\'s TimeLogger',
  description: 'A responsive web-based Internship Time Tracker using Firebase.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/src/app/favicon.svg" type="image/svg+xml" />
      </head>
      <body 
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}
        suppressHydrationWarning
      >
        <div className="no-print">
          <DonateBanner />
        </div>
        <FirebaseClientProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
