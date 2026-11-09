/**
 * Static Cloudflare Pages output. No database and no server.
 * Writes dist-pages/, which can be uploaded as-is.
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build, createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "dist-pages");
const nestedHtml = resolve(outDir, "pages", "index.html");

const shared = {
  root,
  configFile: false,
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), react()],
};

await build({
  ...shared,
  publicDir: resolve(root, "public"),
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "pages/index.html"),
    },
  },
});

const server = await createServer({
  ...shared,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

let html = readFileSync(nestedHtml, "utf8");
try {
  const mod = await server.ssrLoadModule("/src/pages-render.tsx");
  const body = mod.renderBench();
  if (!html.includes('<div id="root"></div>')) {
    throw new Error("Built index.html has no empty #root");
  }
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
} finally {
  await server.close();
}

html = html.replaceAll("../assets/", "/assets/");
writeFileSync(resolve(outDir, "index.html"), html);
rmSync(resolve(outDir, "pages"), { recursive: true, force: true });

const required = [
  "index.html",
  "404.html",
  "_headers",
  "robots.txt",
  "favicon.svg",
  "og.jpg",
  "__grok/icon-180.png",
];
for (const file of required) {
  readFileSync(resolve(outDir, file));
}

const headers = readFileSync(resolve(outDir, "_headers"));
const publicHeaders = readFileSync(resolve(root, "public/_headers"));
if (!headers.equals(publicHeaders)) {
  throw new Error("dist-pages/_headers is not byte-identical to public/_headers");
}

const page = readFileSync(resolve(outDir, "index.html"), "utf8");
for (const word of ["Semaglutide", "Tirzepatide", "Retatrutide", "noimageai"]) {
  if (!page.includes(word)) throw new Error(`dist-pages/index.html is missing ${word}`);
}

console.log(`Pages output: ${outDir}`);
