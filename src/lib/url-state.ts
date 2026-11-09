import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { EXAMPLES } from "./amino/examples.ts";
import { LETTERS, parseSequence } from "./amino/residues.ts";

/**
 * Shareable bench links live in the query string so unknown paths stay 404.
 *
 *   ex    example id, used instead of seq when the chain matches an example
 *   seq   one-letter sequence, valid residues only, capped at 400
 *   pos   selected residue, 1-based
 *   ph    pH, one decimal from 0 to 14
 *   w     hydropathy smoothing window (1, 3, 5, 7, or 9, and not past the chain)
 *
 * Parsing never treats the text as HTML. Callers render it as React text.
 * The hook applies the query after mount so the prerendered page and the
 * first client render stay the same (React hydration error #418).
 */

const VALID_LETTERS = new Set(LETTERS);
const WINDOW_CHOICES = [1, 3, 5, 7, 9] as const;
const MAX_SHARE_SEQUENCE = 400;
const DEFAULT_PH = 7.4;
const MAX_PH_TENTHS = 140;
const MAX_SCAN = 8_000;

export type BenchUrlState = {
  raw: string;
  /** Zero-based residue index. The URL stores this as a 1-based position. */
  selected: number;
  pH: number;
  windowSize: number;
  exampleId: string;
};

export const DEFAULT_BENCH_STATE: BenchUrlState = {
  raw: "YGGFL",
  selected: 0,
  pH: DEFAULT_PH,
  windowSize: 1,
  exampleId: "enk",
};

type ResolvedChain = {
  raw: string;
  exampleId: string;
  focus: number;
  windowSize: number;
};

export function parseBenchSearch(search: string): BenchUrlState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const chain = resolveChain(params) ?? defaultChain();
  const length = chain.raw.length;
  return {
    raw: chain.raw,
    exampleId: chain.exampleId,
    selected: parsePosition(params.get("pos"), length, chain.focus),
    pH: parsePh(params.get("ph")),
    windowSize: parseWindow(params.get("w"), length, chain.windowSize),
  };
}

/**
 * Canonical query string, without the leading "?".
 * Returns "" for the default bench and null when the textarea is not a
 * sequence the bench can model, so a bad edit does not replace the last good link.
 */
export function serializeBenchSearch(state: BenchUrlState): string | null {
  const parsed = parseSequence(state.raw);
  if (parsed.error) return null;
  if (parsed.letters.length === 0) return "";

  const letters = parsed.letters.join("");
  const matched = EXAMPLES.find((example) => example.seq === letters);
  const length = letters.length;
  const normalized: BenchUrlState = {
    raw: matched?.seq ?? letters,
    exampleId: matched?.id ?? "",
    selected: clampIndex(state.selected, length),
    pH: snapPh(state.pH) ?? DEFAULT_PH,
    windowSize: parseWindow(
      String(state.windowSize),
      length,
      matched?.window ?? 1,
    ),
  };
  if (sameBench(normalized, DEFAULT_BENCH_STATE)) return "";

  const params = new URLSearchParams();
  if (matched) params.set("ex", matched.id);
  else params.set("seq", letters);
  params.set("pos", String(normalized.selected + 1));
  params.set("ph", normalized.pH.toFixed(1));
  params.set("w", String(normalized.windowSize));
  return params.toString();
}

export function benchHistoryUrl(
  pathname: string,
  hash: string,
  state: BenchUrlState,
): string | null {
  const search = serializeBenchSearch(state);
  if (search == null) return null;
  return `${pathname}${search ? `?${search}` : ""}${hash}`;
}

export function benchShareHref(
  origin: string,
  pathname: string,
  state: BenchUrlState,
): string | null {
  const search = serializeBenchSearch(state);
  if (search == null) return null;
  return `${origin}${pathname}${search ? `?${search}` : ""}`;
}

export function useBenchUrlState() {
  const [state, setState] = useState<BenchUrlState>(DEFAULT_BENCH_STATE);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    // Batch the parsed bench with `ready` so the address bar is not
    // overwritten with the default state before the query is applied.
    setState(parseBenchSearch(window.location.search));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const next = benchHistoryUrl(
      window.location.pathname,
      window.location.hash,
      state,
    );
    if (next == null) return;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== next) window.history.replaceState(null, "", next);
  }, [ready, state]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current != null) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const markCopied = useCallback(() => {
    setCopied(true);
    if (copiedTimer.current != null) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimer.current = null;
    }, 2000);
  }, []);

  const copyLink = useCallback(() => {
    const href = benchShareHref(
      window.location.origin,
      window.location.pathname,
      state,
    );
    const text = href ?? shareHrefFromLocation();
    void writeClipboard(text).then((ok) => {
      if (ok) markCopied();
    });
  }, [markCopied, state]);

  const setRaw = useField(setState, "raw");
  const setSelected = useField(setState, "selected");
  const setPh = useField(setState, "pH");
  const setWindowSize = useField(setState, "windowSize");
  const setExampleId = useField(setState, "exampleId");

  return {
    raw: state.raw,
    selected: state.selected,
    pH: state.pH,
    windowSize: state.windowSize,
    exampleId: state.exampleId,
    setRaw,
    setSelected,
    setPh,
    setWindowSize,
    setExampleId,
    copied,
    copyLink,
  };
}

function useField<K extends keyof BenchUrlState>(
  setState: Dispatch<SetStateAction<BenchUrlState>>,
  key: K,
) {
  return useCallback(
    (value: SetStateAction<BenchUrlState[K]>) => {
      setState((prev) => ({
        ...prev,
        [key]: applyAction(value, prev[key]),
      }));
    },
    [key, setState],
  );
}

function applyAction<T>(value: SetStateAction<T>, current: T): T {
  if (typeof value === "function") return (value as (prev: T) => T)(current);
  return value;
}

function defaultChain(): ResolvedChain {
  return {
    raw: DEFAULT_BENCH_STATE.raw,
    exampleId: DEFAULT_BENCH_STATE.exampleId,
    focus: DEFAULT_BENCH_STATE.selected,
    windowSize: DEFAULT_BENCH_STATE.windowSize,
  };
}

function resolveChain(params: URLSearchParams): ResolvedChain | null {
  const exampleId = params.get("ex")?.trim() ?? "";
  if (exampleId) {
    const example = EXAMPLES.find((item) => item.id === exampleId);
    if (example) {
      return {
        raw: example.seq,
        exampleId: example.id,
        focus: example.focus,
        windowSize: example.window,
      };
    }
  }

  if (!params.has("seq")) return null;

  const letters = sanitizeSequence(params.get("seq") ?? "");
  if (!letters) return null;
  const matched = EXAMPLES.find((item) => item.seq === letters);
  if (matched) {
    return {
      raw: matched.seq,
      exampleId: matched.id,
      focus: matched.focus,
      windowSize: matched.window,
    };
  }
  return { raw: letters, exampleId: "", focus: 0, windowSize: 1 };
}

/** Keep coded residues only. Brackets and other markup never survive. */
function sanitizeSequence(input: string): string {
  let out = "";
  const upper = input.toUpperCase();
  const limit = Math.min(upper.length, MAX_SCAN);
  for (let i = 0; i < limit && out.length < MAX_SHARE_SEQUENCE; i++) {
    const char = upper[i]!;
    if (VALID_LETTERS.has(char)) out += char;
  }
  return out;
}

function parsePosition(
  raw: string | null,
  length: number,
  fallback: number,
): number {
  const safeFallback = clampIndex(fallback, length);
  if (raw == null) return safeFallback;
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return safeFallback;
  const position = Number(text);
  if (position < 1 || position > length) return safeFallback;
  return position - 1;
}

function parsePh(raw: string | null): number {
  if (raw == null) return DEFAULT_PH;
  const text = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return DEFAULT_PH;
  return snapPh(Number(text)) ?? DEFAULT_PH;
}

function parseWindow(
  raw: string | null,
  length: number,
  fallback: number,
): number {
  const safeFallback = allowedWindow(fallback, length) ? fallback : 1;
  if (raw == null) return safeFallback;
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return safeFallback;
  const size = Number(text);
  return allowedWindow(size, length) ? size : safeFallback;
}

function allowedWindow(size: number, length: number): boolean {
  return (
    WINDOW_CHOICES.some((choice) => choice === size) &&
    (size === 1 || size <= length)
  );
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isInteger(index) || index < 0) return 0;
  return Math.min(index, length - 1);
}

function snapPh(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const tenths = Math.round((value + Number.EPSILON) * 10);
  if (tenths < 0 || tenths > MAX_PH_TENTHS) return null;
  return tenths / 10;
}

function sameBench(a: BenchUrlState, b: BenchUrlState): boolean {
  return (
    a.raw === b.raw &&
    a.selected === b.selected &&
    a.exampleId === b.exampleId &&
    a.windowSize === b.windowSize &&
    Math.round((a.pH + Number.EPSILON) * 10) ===
      Math.round((b.pH + Number.EPSILON) * 10)
  );
}

function shareHrefFromLocation(): string {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

async function writeClipboard(text: string): Promise<boolean> {
  // Selection copy runs synchronously inside the click, before any clipboard
  // permission prompt can consume the user gesture.
  if (copyWithSelection(text)) return true;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function copyWithSelection(text: string): boolean {
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
}
