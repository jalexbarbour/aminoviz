# Aminoviz

Educational peptide-chain bench. Paste a sequence, or open one of the examples, and the page models mass, charge, hydropathy, and a Chou–Fasman call.

## Develop

```bash
npm install
npm run dev
```

The dev server listens on port 8080. `npm test` runs the chemistry parity tests against `deployed/assets/routes-DGnHLI9c.js`, the app unit tests, and the scaffold checks that still apply to this repo. `npm run test:scaffold` runs the full Grok template suite; a few of those still expect skill docs and the stock “Hello World” title, which this source commit does not include. `npm run typecheck` is `tsc --noEmit`.

## Static Pages build

`npm run build` is the app-builder build. It runs a database migration and is not what gets uploaded to Cloudflare Pages.

```bash
npm run build:pages
```

That writes a static site to `dist-pages/`. Upload that directory to the existing Cloudflare Pages project. The upload is done by the maintainer. CI only builds it; it does not deploy, and this repo has no Worker, Wrangler, or Git-to-Pages hook.

`dist-pages/index.html` is prerendered and includes the example names. The directory also contains `404.html`, `_headers` (copied byte-for-byte from `public/_headers`), `robots.txt`, `favicon.svg`, `og.jpg`, and `__grok/`. Nothing in that directory needs a database or a server.
