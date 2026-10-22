/**
 * Renders UI the way the real layout does: the app's QueryProvider and
 * ThemeProvider, plus Next's App Router contexts (outside Next.js there is no
 * router, so navigation is recorded instead of performed).
 */

import React, { type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { THEME_PROVIDER_PROPS } from '@/src/lib/theme';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {
  QueryProvider,
  createQueryClient,
} from '@/src/providers/query-provider';

export function renderApp(ui: ReactElement, { pathname = '/' } = {}) {
  const pushed: string[] = [];
  const router: AppRouterInstance = {
    push: (href) => void pushed.push(href),
    replace: (href) => void pushed.push(href),
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };

  const result = render(
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={new URLSearchParams()}>
          {/* Same setup as src/app/layout.tsx */}
          <ThemeProvider {...THEME_PROVIDER_PROPS}>
            <QueryProvider client={createQueryClient()}>{ui}</QueryProvider>
          </ThemeProvider>
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );

  return { ...result, pushed };
}
