// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * `STATIC=1` builds a fully prerendered static site into dist/client for
 * Firebase Hosting (`bun run build:static` / `bun run deploy`).
 *
 * Without it the build is unchanged: Nitro bundles an SSR server for the
 * Cloudflare target, which is what the Lovable pipeline expects.
 */
const staticBuild = process.env["STATIC"] === "1";

export default defineConfig({
  // Nitro would bundle an SSR server we do not deploy, and it relocates the
  // server build that the prerenderer renders against, which breaks
  // prerendering outright. Omitted entirely otherwise, so the default build
  // keeps Nitro's own defaults.
  ...(staticBuild ? { nitro: false as const } : {}),

  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },

    ...(staticBuild
      ? {
          // Every module computes entirely in the browser — there are no server
          // functions and no server-side data — so each route is prerendered to
          // its own HTML file. That keeps each route's title and og: meta in the
          // initial response, which a single-index.html SPA build would collapse.
          prerender: {
            enabled: true,
            // The sidebar links every module, so crawling "/" reaches all of them.
            crawlLinks: true,
            failOnError: true,
          },
          // Seed the crawl at "/". The prerenderer only accepts 200 responses, so
          // a not-found page cannot be prerendered here; unmatched paths fall back
          // to index.html via the rewrite in firebase.json and the router renders
          // its own 404, which means they answer 200 rather than 404.
          pages: [{ path: "/" }],
        }
      : {}),
  },
});
