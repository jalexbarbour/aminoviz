/**
 * Guard the static page against fixed widths that overflow a 360px phone.
 * Scans dist-pages/index.html and the stylesheets it links.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Wider than a 360px viewport, so the page would scroll sideways. */
export const BREAKING_PX = 360;

const LENGTH = /^(\d*\.?\d+)(px|rem|em)$/;

export function lengthToPx(raw) {
  const match = LENGTH.exec(String(raw).trim());
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2] === "px" ? value : value * 16;
}

function problem(where, detail) {
  return `${where}: ${detail}`;
}

function isRelativeLength(value) {
  return value.includes("%") || value.includes("var(") || value.includes("calc(");
}

export function classWidthProblems(html) {
  const problems = [];
  for (const match of html.matchAll(/class="([^"]*)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (!token) continue;
      if (blockedWidthClass(token)) {
        problems.push(problem(`class ${token}`, "fixed width wider than a 360px screen"));
        continue;
      }
      const arbitrary = /^(min-w|w)-\[(.+)\]$/.exec(token);
      if (!arbitrary) continue;
      const value = arbitrary[2];
      if (value.includes("vw")) {
        problems.push(problem(`class ${token}`, "viewport width can force a horizontal scrollbar"));
        continue;
      }
      if (isRelativeLength(value)) continue;
      const px = lengthToPx(value);
      if (px != null && px > BREAKING_PX) {
        problems.push(problem(`class ${token}`, `fixed width of ${px}px`));
      }
    }
  }
  return problems;
}

export function inlineWidthProblems(html) {
  const problems = [];
  for (const match of html.matchAll(/\sstyle="([^"]*)"/g)) {
    for (const decl of match[1].split(";")) {
      const splitAt = decl.indexOf(":");
      if (splitAt < 0) continue;
      const prop = decl.slice(0, splitAt).trim().toLowerCase();
      const value = decl.slice(splitAt + 1).trim();
      if (prop !== "width" && prop !== "min-width") continue;
      if (value.endsWith("%") || isRelativeLength(value)) continue;
      if (value.includes("vw")) {
        problems.push(problem(`style ${prop}`, `${value} can force a horizontal scrollbar`));
        continue;
      }
      const px = lengthToPx(value);
      if (px != null && px > BREAKING_PX) {
        problems.push(problem(`style ${prop}`, `fixed width of ${px}px`));
      }
    }
  }
  for (const match of html.matchAll(/\swidth="(\d+(?:\.\d+)?)"/g)) {
    const px = Number(match[1]);
    if (px > BREAKING_PX) problems.push(problem(`width="${match[1]}"`, "fixed width attribute"));
  }
  return problems;
}

function mediaMinWidthPx(header) {
  const min = /min-width\s*:\s*(\d*\.?\d+)(px|rem|em)/.exec(header);
  if (min) return lengthToPx(min[1] + min[2]);
  const modern = /width\s*>=\s*(\d*\.?\d+)(px|rem|em)/.exec(header);
  if (modern) return lengthToPx(modern[1] + modern[2]);
  return null;
}

/** Drop desktop-only @media blocks, then return the CSS that can apply on a phone. */
export function cssApplyingOnPhone(css) {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let index = 0;
  let kept = "";
  while (index < cleaned.length) {
    if (cleaned.startsWith("@media", index)) {
      const brace = cleaned.indexOf("{", index);
      if (brace < 0) break;
      const header = cleaned.slice(index, brace);
      let depth = 0;
      let cursor = brace;
      for (; cursor < cleaned.length; cursor++) {
        if (cleaned[cursor] === "{") depth++;
        else if (cleaned[cursor] === "}") {
          depth--;
          if (depth === 0) {
            cursor++;
            break;
          }
        }
      }
      const minWidth = mediaMinWidthPx(header);
      if (minWidth == null || minWidth <= BREAKING_PX) {
        kept += cssApplyingOnPhone(cleaned.slice(brace + 1, cursor - 1));
      }
      index = cursor;
      continue;
    }
    kept += cleaned[index];
    index++;
  }
  return kept;
}

/** Built without a contiguous class token, so Tailwind does not emit the utility. */
function blockedWidthClass(token) {
  const blocked = new Set(
    [
      ["w-", "screen"],
      ["min-w-", "screen"],
      ["w-", "96"],
      ["min-w-", "96"],
    ].map((parts) => parts.join("")),
  );
  return blocked.has(token);
}

function stylesheetRules(css) {
  const rules = [];
  let index = 0;
  while (index < css.length) {
    const brace = css.indexOf("{", index);
    if (brace < 0) break;
    const selector = css.slice(index, brace).trim();
    let depth = 0;
    let cursor = brace;
    for (; cursor < css.length; cursor++) {
      if (css[cursor] === "{") depth++;
      else if (css[cursor] === "}") {
        depth--;
        if (depth === 0) {
          cursor++;
          break;
        }
      }
    }
    const body = css.slice(brace + 1, cursor - 1);
    if (selector.startsWith("@")) rules.push(...stylesheetRules(body));
    else if (selector) rules.push({ selector, body });
    index = cursor;
  }
  return rules;
}

function unescapeClass(token) {
  return token.replace(/\\(.)/g, "$1");
}

function selectorClasses(selector) {
  return [...selector.matchAll(/\.((?:\\.|[^\s.#:[>+~,])+)/g)].map((match) =>
    unescapeClass(match[1]),
  );
}

function usedClasses(html) {
  const used = new Set();
  for (const match of html.matchAll(/class="([^"]*)"/g)) {
    for (const token of match[1].split(/\s+/)) if (token) used.add(token);
  }
  return used;
}

function ruleReachesPhone(selector, html) {
  const classes = selectorClasses(selector);
  if (classes.length === 0) return true;
  if (html == null) return true;
  const used = usedClasses(html);
  return classes.every((name) => used.has(name));
}

function declarationProblems(body) {
  const problems = [];
  const decl = /(?:^|[^-\w])(min-width|width)\s*:\s*([^;}{]+)/g;
  for (const match of body.matchAll(decl)) {
    const prop = match[1];
    const value = match[2].trim();
    if (isRelativeLength(value) && !value.includes("vw")) continue;
    if (value.includes("vw")) {
      problems.push(problem(`css ${prop}`, `${value.trim()} can force a horizontal scrollbar`));
      continue;
    }
    const px = lengthToPx(value);
    if (px != null && px > BREAKING_PX) {
      problems.push(problem(`css ${prop}`, `fixed width of ${px}px`));
    }
  }
  return problems;
}

export function cssWidthProblems(css, html) {
  const phone = cssApplyingOnPhone(css);
  const problems = [];
  for (const rule of stylesheetRules(phone)) {
    if (!ruleReachesPhone(rule.selector, html)) continue;
    problems.push(...declarationProblems(rule.body));
  }
  return problems;
}

export function howToProblems(html) {
  const problems = [];
  const marker = "How to read this";
  const at = html.indexOf(marker);
  if (at < 0) {
    problems.push("missing the How to read this panel");
    return problems;
  }
  const openTagAt = html.lastIndexOf("<details", at);
  if (openTagAt < 0) {
    problems.push("How to read this is not inside a details element");
    return problems;
  }
  const tagEnd = html.indexOf(">", openTagAt);
  const tag = html.slice(openTagAt, tagEnd + 1);
  if (/\sopen(?:[\s=/>])/.test(tag)) {
    problems.push("How to read this is prerendered open, which can disagree on hydration");
  }
  for (const doi of ["10.1016/0022-2836(82)90515-0", "10.1021/bi00699a002"]) {
    if (!html.includes(doi)) problems.push(`missing citation ${doi}`);
  }
  return problems;
}

export function fixedWidthProblems(html, stylesheets = []) {
  return [
    ...classWidthProblems(html),
    ...inlineWidthProblems(html),
    ...stylesheets.flatMap((sheet) => cssWidthProblems(sheet, html)),
  ];
}

function linkedStyles(html, dir) {
  const sheets = [];
  for (const match of html.matchAll(/href="([^"]+\.css)"/g)) {
    const href = match[1];
    if (/^https?:/.test(href)) continue;
    const path = href.startsWith("/") ? resolve(dir, href.slice(1)) : resolve(dir, href);
    sheets.push(readFileSync(path, "utf8"));
  }
  return sheets;
}

export function checkPagesDir(dir = resolve(root, "dist-pages")) {
  const htmlPath = resolve(dir, "index.html");
  const html = readFileSync(htmlPath, "utf8");
  return [
    ...fixedWidthProblems(html, linkedStyles(html, dir)).map((item) => `${htmlPath}: ${item}`),
    ...howToProblems(html).map((item) => `${htmlPath}: ${item}`),
  ];
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const problems = checkPagesDir();
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("dist-pages/index.html has no layout-breaking fixed widths");
}
