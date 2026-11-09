import {
  C_TERM_PKA,
  CLASS_LABEL,
  CLASS_ORDER,
  N_TERM_PKA,
  RESIDUES,
  WATER_DA,
  type IonKind,
  type Residue,
  type SideClass,
} from "./residues.ts";
import { modifiedPeptide, type ModifiedPeptide } from "./modified.ts";

export { SEMAGLUTIDE } from "./modified.ts";

export type IonGroup = {
  id: string;
  label: string;
  kind: IonKind;
  pKa: number;
  /** Fraction still protonated at the chosen pH. */
  protonated: number;
  charge: number;
};

export type StructureCall = "H" | "E" | "T" | "C";

export type Analysis = {
  residues: Residue[];
  letters: string[];
  length: number;
  mass: number;
  gravy: number;
  aliphatic: number;
  extinction: number;
  cystinesPossible: number;
  pI: number;
  pH: number;
  charge: number;
  groups: IonGroup[];
  composition: { klass: SideClass; label: string; count: number; fraction: number }[];
  hydrophobicity: { index: number; score: number; partial: boolean }[];
  calls: StructureCall[];
  windowSize: number;
  outcome: string;
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function protonatedFraction(pKa: number, pH: number): number {
  return 1 / (1 + 10 ** (pH - pKa));
}

export function groupCharge(kind: IonKind, pKa: number, pH: number): number {
  const protonated = protonatedFraction(pKa, pH);
  return kind === "acid" ? protonated - 1 : protonated;
}

function ionGroups(
  residues: Residue[],
  pH: number,
  modification: ModifiedPeptide | null,
): IonGroup[] {
  const acylatedLys = modification ? modification.lysineIndex : -1;
  const groups: IonGroup[] = [
    {
      id: "n-term",
      label: "N-terminus · α-NH₃⁺",
      kind: "base",
      pKa: N_TERM_PKA,
      protonated: protonatedFraction(N_TERM_PKA, pH),
      charge: groupCharge("base", N_TERM_PKA, pH),
    },
  ];
  residues.forEach((residue, index) => {
    if (index === acylatedLys && modification) {
      for (const extra of modification.carboxylates) {
        groups.push({
          id: `K-${index}-${extra.id}`,
          label: extra.label,
          kind: "acid",
          pKa: extra.pKa,
          protonated: protonatedFraction(extra.pKa, pH),
          charge: groupCharge("acid", extra.pKa, pH),
        });
      }
      return;
    }
    if (residue.pKa == null || !residue.ion) return;
    groups.push({
      id: `${residue.letter}-${index}`,
      label: `${residue.code3}${index + 1} · ${residue.name}`,
      kind: residue.ion,
      pKa: residue.pKa,
      protonated: protonatedFraction(residue.pKa, pH),
      charge: groupCharge(residue.ion, residue.pKa, pH),
    });
  });
  if (!modification?.cTerminalAmide) {
    groups.push({
      id: "c-term",
      label: "C-terminus · α-COO⁻",
      kind: "acid",
      pKa: C_TERM_PKA,
      protonated: protonatedFraction(C_TERM_PKA, pH),
      charge: groupCharge("acid", C_TERM_PKA, pH),
    });
  }
  return groups;
}

export function netCharge(residues: Residue[], pH: number, letters: string[] = []): number {
  return ionGroups(residues, pH, modifiedPeptide(letters)).reduce(
    (sum, group) => sum + group.charge,
    0,
  );
}

/** Monotonic bisection. Charge falls as pH rises, so the root is the pI. */
export function isoelectricPoint(residues: Residue[], letters: string[] = []): number {
  let low = 0;
  let high = 14;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (netCharge(residues, mid, letters) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function windowScores(values: number[], size: number) {
  const span = Math.max(1, Math.min(size, values.length || 1));
  const half = Math.floor(span / 2);
  return values.map((_, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(values.length, index + half + 1);
    const slice = values.slice(start, end);
    return {
      index,
      score: avg(slice),
      partial: slice.length < span,
    };
  });
}

function runs(mask: boolean[]): [number, number][] {
  const found: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= mask.length; i++) {
    if (i < mask.length && mask[i]) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      found.push([start, i]);
      start = -1;
    }
  }
  return found;
}

function extendMask(mask: boolean[], values: number[]): boolean[] {
  const next = mask.slice();
  let guard = 0;
  let grew = true;
  while (grew && guard++ < next.length + 2) {
    grew = false;
    for (const [start, end] of runs(next)) {
      if (start > 0 && !next[start - 1]) {
        const slice = values.slice(Math.max(0, start - 1), Math.min(values.length, start + 3));
        if (avg(slice) >= 1) {
          next[start - 1] = true;
          grew = true;
        }
      }
      if (end < next.length && !next[end]) {
        const slice = values.slice(Math.max(0, end - 3), Math.min(values.length, end + 1));
        if (avg(slice) >= 1) {
          next[end] = true;
          grew = true;
        }
      }
    }
  }
  return next;
}

/**
 * A short, documented Chou–Fasman call.
 * Helix: 4 of 6 with Pα > 1, extended while a tetrapeptide mean stays ≥ 1,
 * kept only if the run is ≥ 5 and mean Pα beats mean Pβ.
 * Sheet: the same idea with 3 of 5 and Pβ.
 * Turn: the tetrapeptide product test (fᵢ fᵢ₊₁ fᵢ₊₂ fᵢ₊₃ > 7.5×10⁻⁵) plus
 * mean Pturn above both Pα and Pβ. Turns overwrite short segments.
 */
export function chouFasman(residues: Residue[]): StructureCall[] {
  const n = residues.length;
  const calls: StructureCall[] = Array.from({ length: n }, () => "C");
  if (n === 0) return calls;
  const helix = residues.map((residue) => residue.helix);
  const sheet = residues.map((residue) => residue.sheet);

  const helixNuc = Array.from({ length: n }, () => false);
  for (let i = 0; i <= n - 6; i++) {
    let count = 0;
    for (let k = 0; k < 6; k++) if (helix[i + k]! > 1) count++;
    if (count >= 4) for (let k = 0; k < 6; k++) helixNuc[i + k] = true;
  }
  const helixMask = Array.from({ length: n }, () => false);
  if (n >= 6) {
    for (const [start, end] of runs(extendMask(helixNuc, helix))) {
      if (end - start < 5) continue;
      if (avg(helix.slice(start, end)) > avg(sheet.slice(start, end))) {
        for (let i = start; i < end; i++) helixMask[i] = true;
      }
    }
  }

  const sheetNuc = Array.from({ length: n }, () => false);
  for (let i = 0; i <= n - 5; i++) {
    let count = 0;
    for (let k = 0; k < 5; k++) if (sheet[i + k]! > 1) count++;
    if (count >= 3) for (let k = 0; k < 5; k++) sheetNuc[i + k] = true;
  }
  const sheetMask = Array.from({ length: n }, () => false);
  if (n >= 5) {
    for (const [start, end] of runs(extendMask(sheetNuc, sheet))) {
      if (end - start < 5) continue;
      const meanSheet = avg(sheet.slice(start, end));
      if (meanSheet > avg(helix.slice(start, end)) && meanSheet >= 1.03) {
        for (let i = start; i < end; i++) sheetMask[i] = true;
      }
    }
  }

  const turnMask = Array.from({ length: n }, () => false);
  for (let i = 0; i <= n - 4; i++) {
    const window = residues.slice(i, i + 4);
    const product = window.reduce((acc, residue, offset) => acc * residue.bend[offset]!, 1);
    const meanTurn = avg(window.map((residue) => residue.turn));
    const meanHelix = avg(window.map((residue) => residue.helix));
    const meanSheet = avg(window.map((residue) => residue.sheet));
    if (product > 0.000075 && meanTurn > 1 && meanTurn > meanHelix && meanTurn > meanSheet) {
      for (let k = 0; k < 4; k++) turnMask[i + k] = true;
    }
  }

  for (let i = 0; i < n; i++) {
    if (turnMask[i]) calls[i] = "T";
    else if (helixMask[i]) calls[i] = "H";
    else if (sheetMask[i]) calls[i] = "E";
  }

  for (const symbol of ["H", "E"] as const) {
    const mask = calls.map((call) => call === symbol);
    for (const [start, end] of runs(mask)) {
      if (end - start < 4) {
        for (let i = start; i < end; i++) calls[i] = "C";
      }
    }
  }

  return calls;
}

function callSummary(calls: StructureCall[]): string {
  const count = (symbol: StructureCall) => calls.filter((call) => call === symbol).length;
  const helix = count("H");
  const sheet = count("E");
  const turn = count("T");
  if (calls.length < 4) {
    return "Too short for a Chou–Fasman segment. The per-residue propensities are still worth reading.";
  }
  if (helix === 0 && sheet === 0 && turn === 0) {
    return "Chou–Fasman leaves this chain unstructured: no helix, sheet, or turn cleared its thresholds.";
  }
  const parts: string[] = [];
  if (helix) parts.push(`${helix} helix`);
  if (sheet) parts.push(`${sheet} sheet`);
  if (turn) parts.push(`${turn} turn`);
  return `Chou–Fasman marks ${parts.join(", ")} residue${calls.length === 1 ? "" : "s"}. It is a 1978 statistical guess, not a folded structure.`;
}

function gravyWords(gravy: number): string {
  if (gravy >= 0.5) return "hydrophobic on balance";
  if (gravy <= -0.5) return "hydrophilic on balance";
  return "mixed in hydropathy";
}

function outcomeText(input: {
  residues: Residue[];
  pH: number;
  charge: number;
  pI: number;
  mass: number;
  gravy: number;
  calls: StructureCall[];
  massSentence: string;
}): string {
  const n = input.residues.length;
  const direction =
    input.charge > 0.05
      ? "toward the negative electrode"
      : input.charge < -0.05
        ? "toward the positive electrode"
        : "very little — it is near neutral";
  const waters = n - 1;
  const cys = input.residues.filter((residue) => residue.letter === "C").length;
  const disulfide =
    cys >= 2
      ? ` ${cys} cysteines could pair into ${Math.floor(cys / 2)} disulfide${cys >= 4 ? "s" : ""}.`
      : "";
  return `At pH ${input.pH.toFixed(1)} the net charge is ${input.charge.toFixed(2)}. The isoelectric point is about ${input.pI.toFixed(2)}, so in an electric field the chain would move ${direction}. Joining these ${n} amino acids makes ${waters} peptide bond${waters === 1 ? "" : "s"} and releases ${waters} water molecule${waters === 1 ? "" : "s"}, for a mass near ${input.mass.toFixed(1)} Da.${input.massSentence} The sequence is ${gravyWords(input.gravy)}. ${callSummary(input.calls)}${disulfide}`;
}

export function analyze(letters: string[], pH: number, windowSize: number): Analysis {
  const residues = letters.map((letter) => RESIDUES[letter]!);
  const length = residues.length;
  const modification = modifiedPeptide(letters);
  const mass =
    residues.reduce((sum, residue) => sum + residue.mass, 0) +
    WATER_DA +
    (modification?.adductMass ?? 0);
  const gravy = avg(residues.map((residue) => residue.kd));
  const mole = (letter: string) =>
    (residues.filter((residue) => residue.letter === letter).length / length) * 100;
  const aliphatic = mole("A") + 2.9 * mole("V") + 3.9 * (mole("I") + mole("L"));
  const extinction = residues.reduce((sum, residue) => sum + (residue.extinction ?? 0), 0);
  const cystinesPossible = Math.floor(
    residues.filter((residue) => residue.letter === "C").length / 2,
  );
  const groups = ionGroups(residues, pH, modification);
  const charge = groups.reduce((sum, group) => sum + group.charge, 0);
  const pI = isoelectricPoint(residues, letters);
  const composition = CLASS_ORDER.map((klass) => {
    const count = residues.filter((residue) => residue.klass === klass).length;
    return {
      klass,
      label: CLASS_LABEL[klass],
      count,
      fraction: length ? count / length : 0,
    };
  }).filter((row) => row.count > 0);
  const hydrophobicity = windowScores(
    residues.map((residue) => residue.kd),
    windowSize,
  );
  const calls = chouFasman(residues);
  return {
    residues,
    letters,
    length,
    mass,
    gravy,
    aliphatic,
    extinction,
    cystinesPossible,
    pI,
    pH,
    charge,
    groups,
    composition,
    hydrophobicity,
    calls,
    windowSize: Math.max(1, Math.min(windowSize, length)),
    outcome: outcomeText({
      residues,
      pH,
      charge,
      pI,
      mass,
      gravy,
      calls,
      massSentence: modification?.massSentence ?? "",
    }),
  };
}

export function chargeCurve(residues: Residue[], letters: string[] = []) {
  const points: { pH: number; charge: number }[] = [];
  for (let step = 0; step <= 140; step++) {
    const pH = step / 10;
    points.push({ pH, charge: netCharge(residues, pH, letters) });
  }
  return points;
}

export const CALL_LABEL: Record<StructureCall, string> = {
  H: "Helix",
  E: "Sheet",
  T: "Turn",
  C: "Coil",
};
