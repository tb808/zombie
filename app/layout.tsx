import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { assetPath } from './assetPath';

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
  title: 'Nachtwache — First-Person Zombie Survival',
  icons: { icon: assetPath('/favicon.svg') },
  description: 'Durchquere fünf Orte in Tannwald, rette Überlebende und stelle dich den Infizierten.',
  openGraph: {
    title: 'Nachtwache — Das letzte Signal',
    description: 'Ein storygetriebener First-Person-Zombie-Shooter mit fünf Schauplätzen.',
    images: [{ url: assetPath('/og.png'), width: 1920, height: 1080, alt: 'Die Low-Poly-Welt von Nachtwache' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nachtwache — Das letzte Signal',
    description: 'Ein storygetriebener First-Person-Zombie-Shooter mit fünf Schauplätzen.',
    images: [assetPath('/og.png')],
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
