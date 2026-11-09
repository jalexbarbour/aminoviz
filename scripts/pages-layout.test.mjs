import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BREAKING_PX,
  classWidthProblems,
  cssApplyingOnPhone,
  cssWidthProblems,
  fixedWidthProblems,
  howToProblems,
  inlineWidthProblems,
  lengthToPx,
} from "./pages-layout.mjs";

test("converts px and rem", () => {
  assert.equal(lengthToPx("48px"), 48);
  assert.equal(lengthToPx("1.5rem"), 24);
  assert.equal(lengthToPx("100%"), null);
  assert.ok(BREAKING_PX >= 360);
});

test("allows wrapping utilities and percentage bars", () => {
  const html = `
    <main class="mx-auto w-full max-w-3xl min-w-0">
      <button class="min-h-11 w-12">Y</button>
      <span style="width: 37%"></span>
      <svg width="36" height="36"></svg>
    </main>
  `;
  assert.deepEqual(fixedWidthProblems(html), []);
});

function cls(parts) {
  return parts.join("");
}

test("flags fixed widths that overflow a phone", () => {
  const wide = cls(["w-", "[800px]"]);
  const minRem = cls(["min-w-", "[24rem]"]);
  const scale = cls(["w-", "96"]);
  const screen = cls(["w-", "screen"]);
  const capped = cls(["max-w-", "[800px]"]);
  assert.ok(classWidthProblems(`<div class="${wide}"></div>`).length > 0);
  assert.ok(classWidthProblems(`<div class="${minRem}"></div>`).length > 0);
  assert.ok(classWidthProblems(`<div class="${scale}"></div>`).length > 0);
  assert.ok(classWidthProblems(`<div class="${screen}"></div>`).length > 0);
  assert.ok(inlineWidthProblems('<div style="width: 480px"></div>').length > 0);
  assert.ok(inlineWidthProblems('<img width="900">').length > 0);
  assert.deepEqual(classWidthProblems(`<div class="${capped}"></div>`), []);
  assert.deepEqual(inlineWidthProblems('<div style="max-width: 48rem"></div>'), []);
});

test("ignores desktop-only media queries and flags phone-level fixed widths", () => {
  const desktop = "@media (min-width: 40rem) { .wide { width: 48rem; } }";
  assert.equal(cssApplyingOnPhone(desktop).includes("48rem"), false);
  assert.deepEqual(cssWidthProblems(desktop), []);
  assert.ok(cssWidthProblems(".wide { width: 480px; min-width: 30rem; }").length >= 2);
  assert.deepEqual(cssWidthProblems(".cap { max-width: 48rem; width: 100%; }"), []);
  assert.ok(cssWidthProblems(".vw { width: 100vw; }").length > 0);
  const unused = ".unused { width: 480px; }";
  assert.deepEqual(cssWidthProblems(unused, '<div class="ok"></div>'), []);
  assert.ok(cssWidthProblems(unused, '<div class="unused"></div>').length > 0);
  assert.ok(cssWidthProblems("body { min-width: 800px; }", "<div></div>").length > 0);
});

test("the how-to panel must be present, closed, and cited", () => {
  const closed = `<details class="how-to"><summary><h2>How to read this</h2></summary>
    <a href="https://doi.org/10.1016/0022-2836(82)90515-0">Kyte</a>
    <a href="https://doi.org/10.1021/bi00699a002">Chou</a>
    </details>`;
  assert.deepEqual(howToProblems(closed), []);
  assert.ok(howToProblems("<main></main>").some((item) => item.includes("missing")));
  assert.ok(
    howToProblems(
      `<details open><summary>How to read this</summary></details>`,
    ).some((item) => item.includes("open")),
  );
});
