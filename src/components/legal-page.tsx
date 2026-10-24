import type { ReactNode } from 'react';

/** Shared layout of the privacy policy and terms (linked from Google's sign-in) */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <article className="mx-auto max-w-prose space-y-6 [&_h2]:pt-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_ul]:space-y-1 [&_ul]:text-muted-foreground">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p>Última atualização: {updated}</p>
        </header>
        {children}
      </article>
    </div>
  );
}

export const CONTACT_EMAIL = 'vitordevaps@gmail.com';
