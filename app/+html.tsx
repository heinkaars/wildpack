import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * The HTML shell every web page is rendered into. Native builds never see it.
 *
 * Its job here is the Content-Security-Policy. On the web the Supabase session
 * is kept in localStorage, which any script running on this origin can read —
 * so the protection worth having is that no unexpected script ever runs. This
 * pins scripts, styles and network calls to this origin plus Supabase, and
 * nothing else: an injected <script src="evil.com"> does not load, and neither
 * does an attempt to post the session anywhere off-origin.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const isDev = process.env.NODE_ENV !== 'production';

const policy = [
  "default-src 'self'",

  // React Native Web writes styles into the document at runtime.
  "style-src 'self' 'unsafe-inline'",

  // 'unsafe-inline' covers Expo's inlined bootstrap script. 'wasm-unsafe-eval'
  // is required in production too: expo-sqlite is WebAssembly on web, and
  // without it the local database never opens. Metro's dev bundles additionally
  // evaluate code as text for hot reloading, hence 'unsafe-eval' in dev only.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,

  // Photos are data URLs before upload and blob URLs after download.
  "img-src 'self' data: blob:",

  // Deliberately no CDN here. expo-camera's web build pulls jsQR from
  // cdn.jsdelivr.net for barcode scanning, which this blocks — expect one
  // console error per load saying so. WildPack photographs wildlife and never
  // scans a barcode, and both the camera and its permission flow work without
  // it. Allowing the CDN back would hand a third party a script running on this
  // origin, able to read the session out of localStorage — the exact risk this
  // policy exists to close.

  // Same origin covers /api/*; Supabase covers auth, PostgREST and storage.
  `connect-src 'self' ${supabaseUrl}${isDev ? ' ws: wss: http://localhost:* https://localhost:*' : ''}`,

  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .filter(Boolean)
  .join('; ');

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        {/* First, so it governs everything that follows it. */}
        <meta httpEquiv="Content-Security-Policy" content={policy} />
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Keeps body scrolling off on web, matching native. */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
