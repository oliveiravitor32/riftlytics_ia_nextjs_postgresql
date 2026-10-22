import type { Metadata } from 'next';

import Header from '../components/shared/header/header';

import { ThemeProvider } from 'next-themes';
import { THEME_PROVIDER_PROPS } from '@/src/lib/theme';
import { QueryProvider } from '../providers/query-provider';
import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'Riftlytics',
    template: '%s | Riftlytics',
  },
  description:
    'Estatísticas e ranking de League of Legends para o seu grupo de amigos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn('font-sans', inter.variable)}
    >
      <body>
        <ThemeProvider {...THEME_PROVIDER_PROPS}>
          <QueryProvider>
            <Header />
            <main id="conteudo">{children}</main>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
