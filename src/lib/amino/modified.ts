/**
 * Modified peptides keyed by sequence, the same lookup the live site uses.
 * Numbers and note text are copied from the production bundle. Do not invent values.
 *
 * Tirzepatide: PubChem CID 166567236.
 * Retatrutide: PubChem CID 171390338 and FDA GSRS UNII NOP2Y096GV.
 */

export type ExtraCarboxylate = {
  id: string;
  label: string;
  pKa: number;
};

export type ResidueNote = {
  text: string;
  sideChain?: string;
};

/** A non-standard residue drawn with another residue's published parameters. */
export type StandIn = {
  letter: string;
  /** Residue letter whose Kyte–Doolittle and Chou–Fasman numbers are used. */
  copiedFrom: string;
  /** Word used in the on-screen stand-in label, e.g. "alanine". */
  label: string;
};

export type ModifiedPeptide = {
  /** Zero-based index of the acylated lysine. Its side-chain amine is not a +1. */
  lysineIndex: number;
  adductMass: number;
  /** When true, the C-terminus is an amide and has no carboxylate in the charge model. */
  cTerminalAmide: boolean;
  carboxylates: readonly ExtraCarboxylate[];
  /** Appended to the mass sentence, including the leading space. */
  massSentence: string;
  notes: Readonly<Record<number, ResidueNote>>;
  standIns: Readonly<Record<number, StandIn>>;
};

export const SEMAGLUTIDE = "HXEGTFTSDVSSYLEGQAAKEFIAWLVRGRG";
export const TIRZEPATIDE = "YXEGTFTSDYSIXLDKIAQKAFVQWLIAGGPSSGAPPPS";
export const RETATRUTIDE = "YXQGTFTSDYSILLDKKAQXAFIEYLLEGGPSSGAPPPS";

const ALANINE: StandIn = { letter: "X", copiedFrom: "A", label: "alanine" };

export const MODIFIED_PEPTIDES: Readonly<Record<string, ModifiedPeptide>> = {
  [SEMAGLUTIDE]: {
    lysineIndex: 19,
    adductMass: 715.83,
    cTerminalAmide: false,
    carboxylates: [
      { id: "spacer", label: "Lys20 · spacer carboxyl", pKa: 2.19 },
      { id: "diacid", label: "Lys20 · C18 diacid", pKa: 4.9 },
    ],
    massSentence: " That mass includes the C18 diacid on Lys20.",
    notes: {
      1: {
        text: "X / Aib (position 2): Alpha-aminoisobutyric acid, which protects the peptide from immediate enzymatic destruction.",
      },
      19: {
        text: "Lys (position 20): Modified with an attached C18 fatty diacid chain that allows the drug to bind to albumin, giving it a weekly half-life.",
        sideChain: "—(CH₂)₄—NH—C18 diacid",
      },
      27: {
        text: "Arg (position 28): Replaced to maintain stability.",
      },
    },
    standIns: { 1: ALANINE },
  },
  [TIRZEPATIDE]: {
    lysineIndex: 19,
    adductMass: 742.89,
    cTerminalAmide: true,
    carboxylates: [
      { id: "spacer", label: "Lys20 · spacer carboxyl", pKa: 2.19 },
      { id: "diacid", label: "Lys20 · C20 diacid", pKa: 4.9 },
    ],
    massSentence:
      " That mass includes the C20 diacid and its linker on Lys20, and the C-terminal amide.",
    notes: {
      1: {
        text: "X / Aib (position 2): Alpha-aminoisobutyric acid, which keeps DPP-4 from clipping the first two residues off the chain.",
      },
      12: {
        text: "X / Aib (position 13): A second Aib. Its extra methyl group restricts how the backbone can bend and favors a helical turn.",
      },
      19: {
        text: "Lys (position 20): Modified with a C20 fatty diacid attached through a γGlu–2×OEG linker. The lipid binds albumin, which stretches the half-life to about five days.",
        sideChain: "—(CH₂)₄—NH—OEG–OEG–γGlu–C20 diacid",
      },
      38: {
        text: "Ser (position 39): Ends in a C-terminal amide instead of a free acid, so there is no C-terminal carboxylate to count in the charge model and the chain is 0.98 Da lighter.",
      },
    },
    standIns: { 1: ALANINE, 12: ALANINE },
  },
  [RETATRUTIDE]: {
    lysineIndex: 16,
    adductMass: 611.76,
    cTerminalAmide: true,
    carboxylates: [
      { id: "spacer", label: "Lys17 · spacer carboxyl", pKa: 2.19 },
      { id: "diacid", label: "Lys17 · C20 diacid", pKa: 4.9 },
    ],
    massSentence:
      " That mass includes the C20 diacid and its linker on Lys17, the extra methyl on Leu13, and the C-terminal amide.",
    notes: {
      1: {
        text: "X / Aib (position 2): Alpha-aminoisobutyric acid, which keeps DPP-4 from clipping the first two residues off the chain.",
      },
      12: {
        text: "L / α-methyl-Leu (position 13): α-Methyl-L-leucine, shown with the leucine card because the app has no letter for it. A methyl replaces the α-hydrogen; its 14.03 Da is counted in the total mass. Hydropathy and Chou–Fasman numbers here are leucine stand-ins.",
        sideChain: "—CH₂—CH(CH₃)₂, plus α-methyl, no α-hydrogen",
      },
      16: {
        text: "Lys (position 17): Modified with a C20 fatty diacid attached through a γGlu–OEG linker, one OEG shorter than tirzepatide's. Albumin binding gives a half-life of about six days in early human studies.",
        sideChain: "—(CH₂)₄—NH—OEG–γGlu–C20 diacid",
      },
      19: {
        text: "X / Aib (position 20): A second Aib, which restricts backbone flexibility in the middle of the helix.",
      },
      38: {
        text: "Ser (position 39): Ends in a C-terminal amide instead of a free acid, so there is no C-terminal carboxylate to count in the charge model and the chain is 0.98 Da lighter.",
      },
    },
    standIns: {
      1: ALANINE,
      12: { letter: "L", copiedFrom: "L", label: "leucine" },
      19: ALANINE,
    },
  },
};

export function modifiedPeptide(letters: readonly string[]): ModifiedPeptide | null {
  return MODIFIED_PEPTIDES[letters.join("")] ?? null;
}

export function residueNote(letters: readonly string[], index: number): ResidueNote | null {
  const peptide = modifiedPeptide(letters);
  if (!peptide) return null;
  return peptide.notes[index] ?? null;
}
