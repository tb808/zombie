import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'Nachtwache — Ein Low-Poly-Zombie-Spiel',
  description: 'Kämpfe dich durch Tannwald und bringe das letzte Funksignal durch.',
  openGraph: {
    title: 'Nachtwache — Das letzte Signal',
    description: 'Ein storygetriebenes Low-Poly-Zombie-Survivalspiel in Tannwald.',
    images: [{ url: '/og.png', width: 1920, height: 1080, alt: 'Die Low-Poly-Welt von Nachtwache' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nachtwache — Das letzte Signal',
    description: 'Ein storygetriebenes Low-Poly-Zombie-Survivalspiel in Tannwald.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
