import { modifiedPeptide, type StandIn } from "./modified.ts";
import { RESIDUES } from "./residues.ts";

export type StandInHit = StandIn & {
  index: number;
  /** Accessible name, e.g. "alanine stand-in". */
  accessibleLabel: string;
};

function parametersAreCopied(
  shownLetter: string,
  copiedFrom: string,
): { hydropathy: boolean; chouFasman: boolean } | null {
  const shown = RESIDUES[shownLetter];
  const source = RESIDUES[copiedFrom];
  if (!shown || !source) return null;
  return {
    hydropathy: shown.kd === source.kd,
    chouFasman:
      shown.helix === source.helix && shown.sheet === source.sheet && shown.turn === source.turn,
  };
}

/**
 * Residues whose plotted hydropathy or Chou–Fasman numbers come from `standIns`
 * and actually match that residue in the table. Plain leucine is not a stand-in.
 */
export function standInHits(letters: readonly string[]): readonly StandInHit[] {
  const peptide = modifiedPeptide(letters);
  if (!peptide) return [];
  const hits: StandInHit[] = [];
  for (const [key, standIn] of Object.entries(peptide.standIns)) {
    const index = Number(key);
    if (letters[index] !== standIn.letter) continue;
    const copied = parametersAreCopied(standIn.letter, standIn.copiedFrom);
    if (!copied || (!copied.hydropathy && !copied.chouFasman)) continue;
    hits.push({
      ...standIn,
      index,
      accessibleLabel: `${standIn.label} stand-in`,
    });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits;
}

export function standInAt(letters: readonly string[], index: number): StandInHit | null {
  return standInHits(letters).find((hit) => hit.index === index) ?? null;
}

/** Short chip text, e.g. "Ala" or "Leu". */
export function standInBadgeText(label: string): string {
  if (!label) return "";
  return label.slice(0, 1).toUpperCase() + label.slice(1, 3);
}

function positionList(positions: readonly number[]): string {
  return new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    positions.map(String),
  );
}

/** Footnote for the hydropathy and propensity charts. */
export function standInChartNote(hits: readonly StandInHit[]): string {
  if (hits.length === 0) return "";
  const groups = new Map<string, number[]>();
  for (const hit of hits) {
    const list = groups.get(hit.accessibleLabel) ?? [];
    list.push(hit.index + 1);
    groups.set(hit.accessibleLabel, list);
  }
  const clauses = [...groups.entries()].map(([label, positions]) => {
    if (positions.length === 1) {
      const article = /^[aeiou]/i.test(label) ? "an" : "a";
      return `Position ${positions[0]} is ${article} ${label}`;
    }
    const plural = label.replace(/stand-in$/, "stand-ins");
    return `Positions ${positionList(positions)} are ${plural}`;
  });
  return `${clauses.join(". ")}. Hollow rings mark those positions on the hydropathy and propensity charts.`;
}
