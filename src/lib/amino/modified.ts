/**
 * Modified peptides keyed by sequence, the same lookup the live site uses.
 * Numbers and note text are copied from the production bundle. Do not invent values.
 *
 * Tirzepatide: PubChem CID 166567236.
 * Retatrutide: PubChem CID 171390338 and FDA GSRS UNII NOP2Y096GV.
 * Liraglutide, exenatide, and bivalirudin are cited beside their entries.
 * Each of those adduct masses is the published average molecular weight minus
 * the bare chain (sum of residue masses plus one water).
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

/**
 * Liraglutide. PubChem CID 16134956
 * (https://pubchem.ncbi.nlm.nih.gov/compound/16134956) gives
 * H-His-Ala-Glu-Gly-Thr-Phe-Thr-Ser-Asp-Val-Ser-Ser-Tyr-Leu-Glu-Gly-Gln-Ala-Ala-Lys(1)-Glu-Phe-Ile-Ala-Trp-Leu-Val-Arg-Gly-Arg-Gly-OH
 * with palmitoyl-Glu on that lysine.
 * Victoza label, section 11
 * (https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/022341s046lbl.pdf):
 * arginine replaces lysine at position 34, and a C-16 fatty acid (palmitic acid)
 * with a glutamic acid spacer is on the remaining lysine at position 26.
 * Average MW 3751.2 Da. The FDA chemistry review
 * (https://www.accessdata.fda.gov/drugsatfda_docs/nda/2014/206321Orig1s000ChemR.pdf)
 * prints 3751.20 Da and the USAN name N6-[N-(1-oxohexadecyl)-L-γ-glutamyl]-L-lysyl,
 * which is the γ-carboxyl of glutamate on the lysine and palmitoyl on glutamate's α-amino.
 * Positions below are this 31-residue chain: precursor 26 is index 19, precursor 34 is index 27.
 */
export const LIRAGLUTIDE = "HAEGTFTSDVSSYLEGQAAKEFIAWLVRGRG";

/**
 * Exenatide. Byetta label, section 11
 * (https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/021773Orig1s051correctedlbl.pdf):
 * 39-amino acid peptide amide, C184H282N50O60S, 4186.6 Da, sequence ending in Ser-NH2.
 * PubChem CID 45588096 (https://pubchem.ncbi.nlm.nih.gov/compound/45588096) records the same
 * sequence and the C-terminal amide. No acylated lysine and no other side-chain edit.
 */
export const EXENATIDE = "HGEGTFTSDLSKQMEEEAVRLFIEWLKNGGPSSGAPPPS";

/**
 * Bivalirudin free base. Angiomax RTU label, section 11
 * (https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/211215s000lbl.pdf):
 * D-phenylalanyl-L-prolyl-L-arginyl-L-prolyl-glycyl-glycyl-glycyl-glycyl-L-asparagyl-glycyl-L-α-aspartyl-L-phenylalanyl-L-α-glutamyl-L-α-glutamyl-L-isoleucyl-L-prolyl-L-α-glutamyl-L-α-glutamyl-L-tyrosyl-L-leucine,
 * C98H138N24O33, 2180.32 Da anhydrous free base. The chain starts with D-Phe, drawn here as F.
 * PubChem CID 16129704 (https://pubchem.ncbi.nlm.nih.gov/compound/16129704) gives the same formula
 * and an average mass of 2180.3 Da.
 */
export const BIVALIRUDIN = "FPRPGGGGNGDFEEIPEEYL";

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
  // Bare chain 3383.7247. adductMass = 3751.2 − 3383.7247 = 367.4753.
  // The added group is palmitic acid plus glutamic acid minus the two amide waters.
  // One free acid remains: the α-carboxyl of that N-palmitoyl-γ-glutamyl spacer.
  // pKa 2.19 is the spacer-carboxyl value this table already uses for that group.
  [LIRAGLUTIDE]: {
    lysineIndex: 19,
    adductMass: 367.4753,
    cTerminalAmide: false,
    carboxylates: [{ id: "spacer", label: "Lys20 · spacer carboxyl", pKa: 2.19 }],
    massSentence: " That mass includes the palmitoyl group and its γGlu spacer on Lys20.",
    notes: {
      19: {
        text: "Lys (position 20): The side-chain amine carries palmitic acid through a γ-glutamyl spacer. That amine is not a +1. The spacer's free α-carboxyl is the extra acid. In GLP-1 precursor numbering this lysine is position 26.",
        sideChain: "—(CH₂)₄—NH—γGlu–palmitoyl",
      },
      27: {
        text: "Arg (position 28): Arginine where GLP-1(7–37) has lysine. The Victoza label calls that substitution position 34, which leaves the lysine at precursor position 26 as the acylation site.",
      },
    },
    standIns: {},
  },
  // No acylated lysine, so lysineIndex -1 matches no residue and both lysines stay +1.
  // Bare free-acid chain 4187.6070. adductMass = 4186.6 − 4187.6070 = −1.0070.
  [EXENATIDE]: {
    lysineIndex: -1,
    adductMass: -1.0070,
    cTerminalAmide: true,
    carboxylates: [],
    massSentence: " That mass includes the C-terminal amide.",
    notes: {
      38: {
        text: "Ser (position 39): Ends in a C-terminal amide instead of a free acid, so there is no C-terminal carboxylate to count in the charge model. The label weight, 4186.6 Da, is 1.007 Da below this table's free-acid chain.",
      },
    },
    standIns: {},
  },
  // D-Phe has the same residue mass as L-Phe. Bare chain 2180.3148.
  // adductMass = 2180.32 − 2180.3148 = 0.0052, the label average minus that chain.
  [BIVALIRUDIN]: {
    lysineIndex: -1,
    adductMass: 0.0052,
    cTerminalAmide: false,
    carboxylates: [],
    massSentence: " D-phenylalanine is counted at the same residue mass as L-phenylalanine.",
    notes: {
      0: {
        text: "F / D-Phe (position 1): D-Phenylalanine, shown with the phenylalanine card because the app has no letter for a D amino acid. The side chain and residue mass match L-phenylalanine. Hydropathy and Chou–Fasman numbers here are phenylalanine stand-ins.",
        sideChain: "—CH₂—phenyl, D configuration",
      },
    },
    standIns: {
      0: { letter: "F", copiedFrom: "F", label: "phenylalanine" },
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
