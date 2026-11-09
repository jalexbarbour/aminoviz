/**
 * Side-by-side peptide comparison.
 * Chains line up by index from the N-terminus. There is no scoring,
 * gap penalty, or substitution matrix — a shorter chain simply ends.
 * Modification marks are read from MODIFIED_PEPTIDES.
 */
import { analyze } from "./chemistry.ts";
import { EXAMPLES } from "./examples.ts";
import {
  modifiedPeptide,
  type ModifiedPeptide,
  type ResidueNote,
} from "./modified.ts";
import { parseSequence, RESIDUES, type SideClass } from "./residues.ts";
import { standInAt, type StandInHit } from "./stand-ins.ts";

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 3;

/** Bench examples opened by the compare view. */
export const DEFAULT_COMPARE_IDS = ["sema", "tirz", "reta"] as const;

const AIB_NOTE = /\bAib\b/;

export type ModificationKind =
  | "aib"
  | "acylated-lysine"
  | "c-terminal-amide"
  | "stand-in"
  | "note";

export type PositionModification = {
  kinds: readonly ModificationKind[];
  note: ResidueNote | null;
  /** Same hit the bench badges use, or null when `standInAt` does not mark this residue. */
  standIn: StandInHit | null;
};

/** Every bench example, in bench order, for the compare picker. */
export function compareExampleChoices(): readonly { id: string; name: string; seq: string }[] {
  return EXAMPLES.map((example) => ({
    id: example.id,
    name: example.name,
    seq: example.seq,
  }));
}

export type ChainStats = {
  length: number;
  mass: number;
  charge: number;
  pI: number;
  gravy: number;
};

export type AlignedCell = {
  letter: string | null;
  code3: string | null;
  name: string | null;
  klass: SideClass | null;
  modification: PositionModification | null;
};

export type AlignedPosition = {
  /** Zero-based index from the N-terminus. */
  index: number;
  /** One-based position label. */
  position: number;
  cells: AlignedCell[];
  /** True when two or more active chains do not share the same letter. A gap counts. */
  differs: boolean;
  /** True when any active chain carries a modification or note at this index. */
  highlighted: boolean;
};

export type ComparedChain = {
  letters: string[];
  empty: boolean;
  error: string | null;
  stats: ChainStats | null;
};

export type CompareResult = {
  chains: ComparedChain[];
  positions: AlignedPosition[];
};

type ChainSlice = {
  letters: readonly string[];
  /** Blank or invalid chains stay visible but do not mark every column as different. */
  active: boolean;
};

export function sequencesForExampleIds(ids: readonly string[]): string[] {
  return ids.map((id) => {
    const example = EXAMPLES.find((item) => item.id === id);
    if (!example) throw new Error(`Unknown example ${id}`);
    return example.seq;
  });
}

/**
 * Marks drawn only from a MODIFIED_PEPTIDES record: Aib wording, the acylated
 * lysine index, a C-terminal amide, any stored note, and a stand-in only when
 * `standInAt` returns one — the same positions as the bench badges.
 */
export function positionModification(
  letters: readonly string[],
  index: number,
  peptide: ModifiedPeptide | null = modifiedPeptide(letters),
): PositionModification | null {
  if (!peptide || index < 0 || index >= letters.length) return null;
  const note = peptide.notes[index] ?? null;
  const standIn = standInAt(letters, index);
  const kinds: ModificationKind[] = [];
  const aibByNote = note != null && AIB_NOTE.test(note.text);
  const aibByStandIn = standIn?.letter === "X" && standIn.copiedFrom === "A";
  if (aibByNote || aibByStandIn) kinds.push("aib");
  if (peptide.lysineIndex === index) kinds.push("acylated-lysine");
  if (peptide.cTerminalAmide && index === letters.length - 1) kinds.push("c-terminal-amide");
  if (standIn) kinds.push("stand-in");
  if (note) kinds.push("note");
  if (kinds.length === 0) return null;
  return { kinds, note, standIn };
}

/** Short labels for a marked cell. Stand-in text is the badge's accessible name. */
export function modificationTags(modification: PositionModification): string[] {
  const tags: string[] = [];
  if (modification.kinds.includes("aib")) tags.push("Aib");
  if (modification.kinds.includes("acylated-lysine")) tags.push("Acylated lysine");
  if (modification.kinds.includes("c-terminal-amide")) tags.push("C-terminal amide");
  if (modification.standIn) tags.push(modification.standIn.accessibleLabel);
  else if (tags.length === 0 && modification.kinds.includes("note")) tags.push("Note");
  return tags;
}

export function chainStats(letters: readonly string[], pH: number): ChainStats {
  const model = analyze([...letters], pH, 1);
  return {
    length: model.length,
    mass: model.mass,
    charge: model.charge,
    pI: model.pI,
    gravy: model.gravy,
  };
}

function cellAt(letters: readonly string[], index: number, active: boolean): AlignedCell {
  const letter = letters[index] ?? null;
  if (!letter) {
    return { letter: null, code3: null, name: null, klass: null, modification: null };
  }
  const residue = RESIDUES[letter];
  return {
    letter,
    code3: residue?.code3 ?? null,
    name: residue?.name ?? null,
    klass: residue?.klass ?? null,
    modification: active ? positionModification(letters, index) : null,
  };
}

/** Index alignment. Column i is residue i of every chain, or a gap if that chain has ended. */
export function alignByPosition(chains: readonly ChainSlice[]): AlignedPosition[] {
  const length = chains.reduce((max, chain) => Math.max(max, chain.letters.length), 0);
  const positions: AlignedPosition[] = [];
  for (let index = 0; index < length; index++) {
    const cells = chains.map((chain) => cellAt(chain.letters, index, chain.active));
    const comparable = cells.flatMap((cell, chainIndex) =>
      chains[chainIndex]?.active ? [cell.letter] : [],
    );
    const differs =
      comparable.length >= 2 && comparable.some((letter) => letter !== comparable[0]);
    const highlighted = cells.some((cell) => cell.modification != null);
    positions.push({
      index,
      position: index + 1,
      cells,
      differs,
      highlighted,
    });
  }
  return positions;
}

export function compareSequences(raws: readonly string[], pH: number): CompareResult {
  const slices = raws.map((raw) => {
    const parsed = parseSequence(raw);
    const letters = parsed.error ? [] : parsed.letters;
    const active = letters.length > 0;
    return {
      letters,
      empty: parsed.empty,
      error: parsed.error,
      active,
      stats: active ? chainStats(letters, pH) : null,
    };
  });
  return {
    chains: slices.map(({ active: _active, ...chain }) => chain),
    positions: alignByPosition(slices.map(({ letters, active }) => ({ letters, active }))),
  };
}
