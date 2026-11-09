export type SideClass = "hydrophobic" | "polar" | "acidic" | "basic" | "special";
export type IonKind = "acid" | "base";

export type Residue = {
  letter: string;
  code3: string;
  name: string;
  klass: SideClass;
  /** Average residue mass in the chain, water already removed (Da). */
  mass: number;
  /** Kyte–Doolittle hydropathy (1982). Positive is more hydrophobic. */
  kd: number;
  /** Chou–Fasman conformational parameters (1978), as published ratios. */
  helix: number;
  sheet: number;
  turn: number;
  /** Turn positional frequencies f(i) … f(i+3). */
  bend: readonly [number, number, number, number];
  sideChain: string;
  pKa?: number;
  ion?: IonKind;
  extinction?: number;
  note: string;
};

export const WATER_DA = 18.0153;
export const N_TERM_PKA = 9.69;
export const C_TERM_PKA = 2.34;

export const RESIDUES: Record<string, Residue> = {
  A: {
    letter: "A",
    code3: "Ala",
    name: "Alanine",
    klass: "hydrophobic",
    mass: 71.0788,
    kd: 1.8,
    helix: 1.42,
    sheet: 0.83,
    turn: 0.66,
    bend: [0.06, 0.076, 0.035, 0.058],
    sideChain: "—CH₃",
    note: "Small and nonpolar. The strongest helix former in the Chou–Fasman set. A useful ‘plain’ residue when you are comparing others.",
  },
  R: {
    letter: "R",
    code3: "Arg",
    name: "Arginine",
    klass: "basic",
    mass: 156.1875,
    kd: -4.5,
    helix: 0.98,
    sheet: 0.93,
    turn: 0.95,
    bend: [0.07, 0.106, 0.099, 0.085],
    sideChain: "—(CH₂)₃—NH—C(NH₂)₂⁺",
    pKa: 12.48,
    ion: "base",
    note: "Guanidino group stays protonated across the whole physiological range. The most hydrophilic residue on the Kyte–Doolittle scale.",
  },
  N: {
    letter: "N",
    code3: "Asn",
    name: "Asparagine",
    klass: "polar",
    mass: 114.1038,
    kd: -3.5,
    helix: 0.67,
    sheet: 0.89,
    turn: 1.56,
    bend: [0.161, 0.083, 0.191, 0.091],
    sideChain: "—CH₂—CONH₂",
    note: "Amide side chain. It donates and accepts hydrogen bonds and is a classic turn residue. It can deamidate slowly to aspartate.",
  },
  D: {
    letter: "D",
    code3: "Asp",
    name: "Aspartic acid",
    klass: "acidic",
    mass: 115.0886,
    kd: -3.5,
    helix: 1.01,
    sheet: 0.54,
    turn: 1.46,
    bend: [0.147, 0.11, 0.179, 0.081],
    sideChain: "—CH₂—COO⁻",
    pKa: 3.9,
    ion: "acid",
    note: "Carboxylic acid. At pH 7.4 it is almost fully deprotonated, so it carries −1. Short and charged, it prefers turns over sheets.",
  },
  C: {
    letter: "C",
    code3: "Cys",
    name: "Cysteine",
    klass: "special",
    mass: 103.1388,
    kd: 2.5,
    helix: 0.7,
    sheet: 1.19,
    turn: 1.19,
    bend: [0.149, 0.05, 0.117, 0.128],
    sideChain: "—CH₂—SH",
    pKa: 8.33,
    ion: "acid",
    note: "Thiol. Two cysteines can oxidize to a disulfide (cystine), a covalent cross-link. That bond is not a peptide bond, and it releases no water from the backbone.",
  },
  Q: {
    letter: "Q",
    code3: "Gln",
    name: "Glutamine",
    klass: "polar",
    mass: 128.1307,
    kd: -3.5,
    helix: 1.11,
    sheet: 1.1,
    turn: 0.98,
    bend: [0.074, 0.098, 0.037, 0.098],
    sideChain: "—(CH₂)₂—CONH₂",
    note: "One methylene longer than asparagine. The amide is polar and uncharged at any ordinary pH.",
  },
  E: {
    letter: "E",
    code3: "Glu",
    name: "Glutamic acid",
    klass: "acidic",
    mass: 129.1155,
    kd: -3.5,
    helix: 1.51,
    sheet: 0.37,
    turn: 0.74,
    bend: [0.056, 0.06, 0.077, 0.064],
    sideChain: "—(CH₂)₂—COO⁻",
    pKa: 4.3,
    ion: "acid",
    note: "Like aspartate, negative at neutral pH. It is the strongest helix former and one of the worst sheet formers in this scale.",
  },
  G: {
    letter: "G",
    code3: "Gly",
    name: "Glycine",
    klass: "special",
    mass: 57.0519,
    kd: -0.4,
    helix: 0.57,
    sheet: 0.75,
    turn: 1.56,
    bend: [0.102, 0.085, 0.19, 0.152],
    sideChain: "—H",
    note: "No side chain beyond hydrogen. The backbone is unusually flexible, which breaks helices and favors turns. It is also achiral.",
  },
  H: {
    letter: "H",
    code3: "His",
    name: "Histidine",
    klass: "basic",
    mass: 137.1411,
    kd: -3.2,
    helix: 1.0,
    sheet: 0.87,
    turn: 0.95,
    bend: [0.14, 0.047, 0.093, 0.054],
    sideChain: "—CH₂—imidazole",
    pKa: 6.04,
    ion: "base",
    note: "Imidazole pKa sits near neutrality, so a small pH shift changes its charge. That is why histidine shows up in enzyme active sites.",
  },
  I: {
    letter: "I",
    code3: "Ile",
    name: "Isoleucine",
    klass: "hydrophobic",
    mass: 113.1594,
    kd: 4.5,
    helix: 1.08,
    sheet: 1.6,
    turn: 0.47,
    bend: [0.043, 0.034, 0.013, 0.056],
    sideChain: "—CH(CH₃)—CH₂—CH₃",
    note: "Branched at the beta carbon. Very hydrophobic and the second-strongest sheet former. Rare in turns.",
  },
  L: {
    letter: "L",
    code3: "Leu",
    name: "Leucine",
    klass: "hydrophobic",
    mass: 113.1594,
    kd: 3.8,
    helix: 1.21,
    sheet: 1.3,
    turn: 0.59,
    bend: [0.061, 0.025, 0.036, 0.07],
    sideChain: "—CH₂—CH(CH₃)₂",
    note: "Same mass as isoleucine, different shape: the branch is one carbon further out. Common in both helices and the cores of proteins.",
  },
  K: {
    letter: "K",
    code3: "Lys",
    name: "Lysine",
    klass: "basic",
    mass: 128.1741,
    kd: -3.9,
    helix: 1.14,
    sheet: 0.74,
    turn: 1.01,
    bend: [0.055, 0.115, 0.072, 0.095],
    sideChain: "—(CH₂)₄—NH₃⁺",
    pKa: 10.54,
    ion: "base",
    note: "A long arm ending in an amino group. Protonated (+1) until the pH climbs past ~10.5. Often sits on the surface of a folded protein.",
  },
  M: {
    letter: "M",
    code3: "Met",
    name: "Methionine",
    klass: "hydrophobic",
    mass: 131.1926,
    kd: 1.9,
    helix: 1.45,
    sheet: 1.05,
    turn: 0.6,
    bend: [0.068, 0.082, 0.014, 0.055],
    sideChain: "—(CH₂)₂—S—CH₃",
    note: "Thioether, not a thiol — it does not form disulfides. Hydrophobic and a strong helix former. The usual first residue of a newly made protein, then often cleaved.",
  },
  F: {
    letter: "F",
    code3: "Phe",
    name: "Phenylalanine",
    klass: "hydrophobic",
    mass: 147.1766,
    kd: 2.8,
    helix: 1.13,
    sheet: 1.38,
    turn: 0.6,
    bend: [0.059, 0.041, 0.065, 0.065],
    sideChain: "—CH₂—phenyl",
    note: "Aromatic and hydrophobic. Unlike tyrosine and tryptophan it has no polar handle, so it absorbs very little light at 280 nm.",
  },
  P: {
    letter: "P",
    code3: "Pro",
    name: "Proline",
    klass: "special",
    mass: 97.1167,
    kd: -1.6,
    helix: 0.57,
    sheet: 0.55,
    turn: 1.52,
    bend: [0.102, 0.301, 0.034, 0.068],
    sideChain: "pyrrolidine (N is inside the ring)",
    note: "The side chain loops back onto the backbone nitrogen, so proline cannot donate a backbone hydrogen bond. It kinks helices and is the most common residue at the second position of a beta turn.",
  },
  S: {
    letter: "S",
    code3: "Ser",
    name: "Serine",
    klass: "polar",
    mass: 87.0782,
    kd: -0.8,
    helix: 0.77,
    sheet: 0.75,
    turn: 1.43,
    bend: [0.12, 0.139, 0.125, 0.106],
    sideChain: "—CH₂—OH",
    note: "A primary alcohol. It hydrogen-bonds, is a common phosphorylation site, and shows up often in turns.",
  },
  T: {
    letter: "T",
    code3: "Thr",
    name: "Threonine",
    klass: "polar",
    mass: 101.1051,
    kd: -0.7,
    helix: 0.83,
    sheet: 1.19,
    turn: 0.96,
    bend: [0.086, 0.108, 0.065, 0.079],
    sideChain: "—CH(OH)—CH₃",
    note: "Secondary alcohol, beta-branched like valine. More comfortable in a sheet than serine is, and also a phosphorylation site.",
  },
  W: {
    letter: "W",
    code3: "Trp",
    name: "Tryptophan",
    klass: "hydrophobic",
    mass: 186.2132,
    kd: -0.9,
    helix: 1.08,
    sheet: 1.37,
    turn: 0.96,
    bend: [0.077, 0.013, 0.064, 0.167],
    sideChain: "—CH₂—indole",
    extinction: 5500,
    note: "Largest side chain. The indole dominates absorbance at 280 nm (about 5500 M⁻¹ cm⁻¹). Its Kyte–Doolittle score is slightly negative even though it is usually grouped with the hydrophobics.",
  },
  Y: {
    letter: "Y",
    code3: "Tyr",
    name: "Tyrosine",
    klass: "polar",
    mass: 163.176,
    kd: -1.3,
    helix: 0.69,
    sheet: 1.47,
    turn: 1.14,
    bend: [0.082, 0.065, 0.114, 0.125],
    sideChain: "—CH₂—phenol",
    pKa: 10.07,
    ion: "acid",
    extinction: 1490,
    note: "A phenol. Mostly uncharged at pH 7.4; it loses its proton only above ~10. It absorbs at 280 nm and prefers sheets to helices.",
  },
  V: {
    letter: "V",
    code3: "Val",
    name: "Valine",
    klass: "hydrophobic",
    mass: 99.1326,
    kd: 4.2,
    helix: 1.06,
    sheet: 1.7,
    turn: 0.5,
    bend: [0.062, 0.048, 0.028, 0.053],
    sideChain: "—CH(CH₃)₂",
    note: "Beta-branched and strongly hydrophobic. The highest sheet propensity of the twenty, and a poor turn residue.",
  },
  X: {
    letter: "X",
    code3: "Aib",
    name: "α-aminoisobutyric acid",
    klass: "special",
    mass: 85.1041,
    kd: 1.8,
    helix: 1.42,
    sheet: 0.83,
    turn: 0.66,
    bend: [0.06, 0.076, 0.035, 0.058],
    sideChain: "—C(CH₃)₂—, no α-hydrogen",
    note: "Not one of the twenty coded amino acids. Two methyl groups replace the alpha hydrogen. Hydropathy and Chou–Fasman numbers here are alanine stand-ins; Aib was not in those tables.",
  },
};

export const LETTERS = Object.keys(RESIDUES);

export const CLASS_ORDER: SideClass[] = [
  "hydrophobic",
  "polar",
  "acidic",
  "basic",
  "special",
];

export const CLASS_LABEL: Record<SideClass, string> = {
  hydrophobic: "Hydrophobic",
  polar: "Polar",
  acidic: "Acidic",
  basic: "Basic",
  special: "Special",
};

export const BY_CLASS: Record<SideClass, Residue[]> = {
  hydrophobic: ["A", "V", "L", "I", "M", "F", "W"].map((l) => RESIDUES[l]!),
  polar: ["S", "T", "N", "Q", "Y"].map((l) => RESIDUES[l]!),
  acidic: ["D", "E"].map((l) => RESIDUES[l]!),
  basic: ["K", "R", "H"].map((l) => RESIDUES[l]!),
  special: ["G", "P", "C", "X"].map((l) => RESIDUES[l]!),
};

const THREE: Record<string, string> = {};
for (const r of Object.values(RESIDUES)) THREE[r.code3.toUpperCase()] = r.letter;

const FULL_NAMES: [string, string][] = [
  ["phenylalanine", "Phe"],
  ["isoleucine", "Ile"],
  ["aspartic acid", "Asp"],
  ["asparagine", "Asn"],
  ["glutamic acid", "Glu"],
  ["glutamine", "Gln"],
  ["tryptophan", "Trp"],
  ["methionine", "Met"],
  ["arginine", "Arg"],
  ["histidine", "His"],
  ["cysteine", "Cys"],
  ["threonine", "Thr"],
  ["tyrosine", "Tyr"],
  ["leucine", "Leu"],
  ["proline", "Pro"],
  ["alanine", "Ala"],
  ["glycine", "Gly"],
  ["serine", "Ser"],
  ["lysine", "Lys"],
  ["valine", "Val"],
  ["alpha-aminoisobutyric acid", "Aib"],
  ["aminoisobutyric acid", "Aib"],
];

export type ParseResult = {
  letters: string[];
  empty: boolean;
  error: string | null;
};

const MAX_LEN = 400;

export function parseSequence(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/).filter((line) => !line.trim().startsWith(">"));
  let text = lines.join(" ").trim();
  if (!text) return { letters: [], empty: true, error: null };

  for (const [name, code] of FULL_NAMES) {
    text = text.replace(new RegExp(`\\b${name}\\b`, "gi"), code);
  }

  const tokens = text.split(/[^A-Za-z]+/).filter(Boolean);
  const separated = /[-–—,;/]/.test(text) || tokens.length > 1;
  const hasLower = tokens.some((token) => /[a-z]/.test(token));
  const allThree = tokens.every((token) => token.length === 3 && THREE[token.toUpperCase()]);

  if (allThree && (separated || hasLower)) {
    if (tokens.length > MAX_LEN) {
      return {
        letters: [],
        empty: false,
        error: `Keep the chain to ${MAX_LEN} residues so the models stay readable.`,
      };
    }
    return {
      letters: tokens.map((token) => THREE[token.toUpperCase()]!),
      empty: false,
      error: null,
    };
  }

  const compact = tokens.join("");
  if (!compact) return { letters: [], empty: true, error: null };

  const letters: string[] = [];
  for (let i = 0; i < compact.length; i++) {
    const letter = compact[i]!.toUpperCase();
    if (!RESIDUES[letter]) {
      return {
        letters: [],
        empty: false,
        error: `"${compact[i]}" is not a coded amino acid. Use one-letter codes, X for Aib, or names like Gly-Leu.`,
      };
    }
    letters.push(letter);
    if (letters.length > MAX_LEN) {
      return {
        letters: [],
        empty: false,
        error: `Keep the chain to ${MAX_LEN} residues so the models stay readable.`,
      };
    }
  }
  return { letters, empty: false, error: null };
}
