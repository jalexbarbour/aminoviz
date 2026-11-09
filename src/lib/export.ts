import { type Analysis, type StructureCall } from "./amino/chemistry.ts";
import { EXAMPLES } from "./amino/examples.ts";
import { residueNote } from "./amino/modified.ts";
import {
  CLASS_LABEL,
  CLASS_ORDER,
  type Residue,
  type SideClass,
} from "./amino/residues.ts";
import { sourcesForExample } from "./amino/sources.ts";
import { standInAt, standInBadgeText } from "./amino/stand-ins.ts";

/** UTF-8 byte order mark. Excel uses it to open the file as Unicode. */
export const CSV_BOM = "\uFEFF";

const CSV_COLUMNS = [
  "position",
  "one_letter",
  "three_letter",
  "name",
  "class",
  "residue_mass",
  "kyte_doolittle",
  "propensity",
  "structure_call",
  "stand_in",
  "note",
] as const;

const CSV_COMMENT =
  "# Aminoviz peptide analysis. kyte_doolittle is the Kyte-Doolittle hydropathy. propensity is the strongest Chou-Fasman parameter among helix sheet and turn; ties prefer helix then sheet. structure_call is H E T or C. stand_in is the chip badge or no.";

/**
 * RFC 4180 field encoding. Commas, quotes, and line breaks are quoted;
 * embedded quotes are doubled. Unicode is left as UTF-8 text.
 */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function csvRecord(fields: readonly string[]): string {
  return fields.map(escapeCsvField).join(",");
}

/** Join records with CRLF and prefix the UTF-8 BOM. */
export function buildCsv(rows: readonly (readonly string[])[]): string {
  return `${CSV_BOM}${rows.map(csvRecord).join("\r\n")}\r\n`;
}

/** Strongest Chou–Fasman parameter. Ties prefer helix, then sheet, then turn. */
export function propensityFlag(residue: Residue): "helix" | "sheet" | "turn" {
  const ranked = [
    ["helix", residue.helix],
    ["sheet", residue.sheet],
    ["turn", residue.turn],
  ] as const;
  let best: (typeof ranked)[number] = ranked[0];
  for (const entry of ranked) {
    if (entry[1] > best[1]) best = entry;
  }
  return best[0];
}

function formatMass(value: number): string {
  return value
    .toFixed(4)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function sourceUrls(letters: readonly string[]): string {
  const example = EXAMPLES.find((item) => item.seq === letters.join(""));
  if (!example) return "";
  return sourcesForExample(example.id)
    .map((source) => source.url)
    .join(" ");
}

function summaryRows(model: Analysis): string[][] {
  return [
    ["sequence", model.letters.join("")],
    ["pH", model.pH.toFixed(1)],
    ["total mass (Da)", model.mass.toFixed(2)],
    ["net charge", model.charge.toFixed(2)],
    ["pI", model.pI.toFixed(2)],
    ["GRAVY", model.gravy.toFixed(2)],
    ["sources", sourceUrls(model.letters)],
  ];
}

function standInCell(letters: readonly string[], index: number): string {
  const hit = standInAt(letters, index);
  return hit ? standInBadgeText(hit.label) : "no";
}

function residueRow(model: Analysis, index: number): string[] {
  const residue = model.residues[index]!;
  return [
    String(index + 1),
    residue.letter,
    residue.code3,
    residue.name,
    CLASS_LABEL[residue.klass],
    formatMass(residue.mass),
    residue.kd.toFixed(1),
    propensityFlag(residue),
    model.calls[index]!,
    standInCell(model.letters, index),
    residueNote(model.letters, index)?.text ?? "",
  ];
}

/** CSV for one `analyze()` result. No chemistry beyond that result and its notes. */
export function buildAnalysisCsv(model: Analysis): string {
  const rows: string[][] = [
    [CSV_COMMENT],
    ...summaryRows(model),
    [...CSV_COLUMNS],
    ...model.residues.map((_, index) => residueRow(model, index)),
  ];
  return buildCsv(rows);
}

export function analysisCsvBlob(model: Analysis): Blob {
  return new Blob([buildAnalysisCsv(model)], {
    type: "text/csv;charset=utf-8",
  });
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sequenceSlug(letters: readonly string[]): string {
  const seq = letters
    .join("")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (seq.length <= 40) return seq;
  return `${seq.slice(0, 40)}-${letters.length}`;
}

/** `aminoviz-semaglutide` from an example name, otherwise from the sequence. */
export function exportBasename(
  exampleName: string | null,
  letters: readonly string[],
): string {
  const named = exampleName?.trim() ? slugify(exampleName.trim()) : "";
  const slug = named || sequenceSlug(letters) || "peptide";
  return `aminoviz-${slug}`;
}

const THEME = {
  bg: "#12110e",
  surface2: "#26231d",
  fg: "#f4eee4",
  muted: "#a39888",
  line: "#3a342b",
  copper: "#e08a3c",
  ink: "#1a1208",
  hydrophobic: "#e0a15a",
  polar: "#7dcec2",
  acidic: "#e58b84",
  basic: "#8eb0ea",
  special: "#cbbfa8",
} as const;

const CLASS_FILL: Record<SideClass, string> = {
  hydrophobic: THEME.hydrophobic,
  polar: THEME.polar,
  acidic: THEME.acidic,
  basic: THEME.basic,
  special: THEME.special,
};

const CALL_FILL: Record<StructureCall, string> = {
  H: THEME.copper,
  E: THEME.basic,
  T: THEME.polar,
  C: THEME.surface2,
};

const CALL_TEXT: Record<StructureCall, string> = {
  H: THEME.ink,
  E: THEME.ink,
  T: THEME.ink,
  C: THEME.muted,
};

const CALL_LEGEND: { call: StructureCall; label: string }[] = [
  { call: "H", label: "Helix" },
  { call: "E", label: "Sheet" },
  { call: "T", label: "Turn" },
  { call: "C", label: "Coil" },
];

const CHIP = 48;
const CHIP_RADIUS = 12;
const CALL_H = 28;
const CALL_RADIUS = 6;
const GAP = 6;
const STACK_GAP = 6;
const ROW_GAP = 14;
const PAD = 32;
const MAX_COLS = 12;

const FONT_SANS = "Outfit, ui-sans-serif, system-ui, sans-serif";
const FONT_SERIF = "Fraunces, ui-serif, Georgia, serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

function gridShape(length: number): { cols: number; rows: number } {
  const count = Math.max(length, 1);
  if (count <= MAX_COLS) return { cols: count, rows: 1 };
  const rows = Math.ceil(count / MAX_COLS);
  return { cols: Math.ceil(count / rows), rows };
}

function traceRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  traceRoundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

function wrapWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
): string[] {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const pushWord = (word: string) => {
    if (ctx.measureText(word).width > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(...wrapCharacters(ctx, word, font, maxWidth));
      return;
    }
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  };
  for (const word of words) pushWord(word);
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function wrapCharacters(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
): string[] {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = THEME.surface2;
  fillRoundRect(ctx, x, y, 28, 28, 8);
  const cy = y + 14;
  const dots = [8, 14, 20];
  const colors = [THEME.polar, THEME.copper, THEME.basic];
  for (let i = 0; i < dots.length; i++) {
    ctx.beginPath();
    ctx.fillStyle = colors[i]!;
    ctx.arc(x + dots[i]!, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = THEME.fg;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 10.4, cy);
  ctx.lineTo(x + 11.6, cy);
  ctx.moveTo(x + 16.4, cy);
  ctx.lineTo(x + 17.6, cy);
  ctx.stroke();
}

type LegendItem = {
  fill: string;
  label: string;
  glyph?: string;
  glyphColor?: string;
};

function drawLegend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  title: string,
  items: readonly LegendItem[],
): number {
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = THEME.copper;
  ctx.font = `500 12px ${FONT_SANS}`;
  ctx.fillText(title.toUpperCase(), x, y + 8);
  let cursor = x;
  let rowY = y + 26;
  for (const item of items) {
    ctx.font = `400 14px ${FONT_SANS}`;
    const itemWidth = 18 + 8 + ctx.measureText(item.label).width + 20;
    if (cursor > x && cursor + itemWidth > x + width) {
      cursor = x;
      rowY += 32;
    }
    ctx.fillStyle = item.fill;
    fillRoundRect(ctx, cursor, rowY, 18, 18, 5);
    if (item.glyph) {
      ctx.fillStyle = item.glyphColor ?? THEME.ink;
      ctx.font = `500 11px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.fillText(item.glyph, cursor + 9, rowY + 10);
      ctx.textAlign = "left";
    } else if (item.fill === THEME.surface2) {
      ctx.strokeStyle = THEME.line;
      ctx.lineWidth = 1;
      traceRoundRect(ctx, cursor + 0.5, rowY + 0.5, 17, 17, 5);
      ctx.stroke();
    }
    ctx.fillStyle = THEME.fg;
    ctx.font = `400 14px ${FONT_SANS}`;
    ctx.fillText(item.label, cursor + 26, rowY + 9);
    cursor += itemWidth;
  }
  return rowY + 28;
}

export type ChainPngInput = {
  model: Analysis;
  title: string;
  selected: number;
};

/**
 * Draw the colored chain strip, the call chips, and a legend.
 * Browser-only: call from a click handler, never during render.
 */
function strokeOffsetRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) {
  const gap = 3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  traceRoundRect(
    ctx,
    x - gap,
    y - gap,
    width + gap * 2,
    height + gap * 2,
    radius + gap,
  );
  ctx.stroke();
}

export async function renderChainPng(input: ChainPngInput): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("PNG export runs in the browser");
  }
  await document.fonts?.ready;
  const scale = 2;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas is unavailable");
  const { model, title, selected } = input;
  const shape = gridShape(model.length);
  const gridWidth = shape.cols * CHIP + Math.max(0, shape.cols - 1) * GAP;
  const width = Math.max(gridWidth + PAD * 2, 720);
  const contentWidth = width - PAD * 2;
  const titleFont = `600 30px ${FONT_SERIF}`;
  const sequenceFont = `400 14px ${FONT_MONO}`;
  const captionFont = `400 13px ${FONT_SANS}`;
  const titleLines = wrapWords(measure, title, titleFont, contentWidth);
  const sequenceLines = wrapCharacters(
    measure,
    model.letters.join(""),
    sequenceFont,
    contentWidth,
  );
  const caption =
    "Color is the side-chain class. The letter under each residue is the Chou–Fasman call: H helix, E sheet, T turn, C coil. A copper outline marks a position note.";
  const captionLines = wrapWords(measure, caption, captionFont, contentWidth);
  const gridHeight =
    shape.rows * (CHIP + STACK_GAP + CALL_H) +
    Math.max(0, shape.rows - 1) * ROW_GAP;
  // Extra room so a wrapped legend cannot paint past the bitmap; the result is cropped.
  const height =
    PAD +
    28 +
    18 +
    titleLines.length * 38 +
    22 +
    sequenceLines.length * 20 +
    22 +
    gridHeight +
    36 +
    160 +
    captionLines.length * 20 +
    PAD +
    80;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.scale(scale, scale);
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "middle";

  let y = PAD;
  drawMark(ctx, PAD, y);
  ctx.fillStyle = THEME.copper;
  ctx.font = `500 12px ${FONT_SANS}`;
  ctx.textAlign = "left";
  ctx.fillText("AMINOVIZ", PAD + 38, y + 14);
  ctx.fillStyle = THEME.muted;
  ctx.font = `400 13px ${FONT_MONO}`;
  ctx.textAlign = "right";
  ctx.fillText("N  →  C", width - PAD, y + 14);
  y += 28 + 18;

  ctx.textAlign = "left";
  ctx.fillStyle = THEME.fg;
  ctx.font = titleFont;
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y + 16);
    y += 38;
  }
  ctx.fillStyle = THEME.muted;
  ctx.font = `400 14px ${FONT_SANS}`;
  ctx.fillText(
    `${model.length} residue${model.length === 1 ? "" : "s"}`,
    PAD,
    y + 8,
  );
  y += 22;

  ctx.font = sequenceFont;
  ctx.fillStyle = THEME.fg;
  for (const line of sequenceLines) {
    ctx.fillText(line, PAD, y + 8);
    y += 20;
  }
  y += 22;

  const noted = model.letters.map(
    (_, index) => residueNote(model.letters, index) != null,
  );
  const gridTop = y;
  model.residues.forEach((residue, index) => {
    const column = index % shape.cols;
    const row = Math.floor(index / shape.cols);
    const x = PAD + column * (CHIP + GAP);
    const chipY = gridTop + row * (CHIP + STACK_GAP + CALL_H + ROW_GAP);
    ctx.fillStyle = CLASS_FILL[residue.klass];
    fillRoundRect(ctx, x, chipY, CHIP, CHIP, CHIP_RADIUS);
    ctx.fillStyle = THEME.ink;
    ctx.font = `500 18px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.fillText(residue.letter, x + CHIP / 2, chipY + CHIP / 2 + 1);
    const active = index === selected && !noted[index];
    if (noted[index] || active) {
      strokeOffsetRing(
        ctx,
        x,
        chipY,
        CHIP,
        CHIP,
        CHIP_RADIUS,
        noted[index] ? THEME.copper : THEME.fg,
      );
    }
    const call = model.calls[index]!;
    const callY = chipY + CHIP + STACK_GAP;
    ctx.fillStyle = CALL_FILL[call];
    fillRoundRect(ctx, x, callY, CHIP, CALL_H, CALL_RADIUS);
    ctx.fillStyle = CALL_TEXT[call];
    ctx.font = `500 12px ${FONT_MONO}`;
    ctx.fillText(call, x + CHIP / 2, callY + CALL_H / 2 + 0.5);
  });

  y = gridTop + gridHeight + 28;
  y = drawLegend(
    ctx,
    PAD,
    y,
    contentWidth,
    "Side-chain class",
    CLASS_ORDER.map((klass) => ({
      fill: CLASS_FILL[klass],
      label: CLASS_LABEL[klass],
    })),
  );
  y += 14;
  y = drawLegend(
    ctx,
    PAD,
    y,
    contentWidth,
    "Chou–Fasman call",
    CALL_LEGEND.map((item) => ({
      fill: CALL_FILL[item.call],
      label: item.label,
      glyph: item.call,
      glyphColor: CALL_TEXT[item.call],
    })),
  );
  y += 16;
  ctx.textAlign = "left";
  ctx.fillStyle = THEME.muted;
  ctx.font = captionFont;
  for (const line of captionLines) {
    ctx.fillText(line, PAD, y + 8);
    y += 18;
  }

  const usedHeight = Math.min(height, y + PAD);
  const cropped = document.createElement("canvas");
  cropped.width = canvas.width;
  cropped.height = Math.ceil(usedHeight * scale);
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas is unavailable");
  croppedCtx.drawImage(canvas, 0, 0);
  return blobFromCanvas(cropped);
}

function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG encoding failed"));
    }, "image/png");
  });
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
