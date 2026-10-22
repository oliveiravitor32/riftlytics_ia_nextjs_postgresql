/**
 * Theme setup shared by the app (src/app/layout.tsx) and the UI tests.
 * The site looks best dark, so everyone starts dark whatever their system
 * theme; picking light or "system" in the header is remembered.
 * New storage key: visitors who had "system" saved before also start dark.
 */
export const THEME_PROVIDER_PROPS = {
  attribute: 'class',
  defaultTheme: 'dark',
  enableSystem: true,
  disableTransitionOnChange: true,
  storageKey: 'riftlytics-tema',
} as const;
