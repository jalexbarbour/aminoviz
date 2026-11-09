import { BIVALIRUDIN, EXENATIDE, LIRAGLUTIDE, RETATRUTIDE, SEMAGLUTIDE, TIRZEPATIDE } from "./modified.ts";

export type Example = {
  id: string;
  name: string;
  seq: string;
  window: number;
  blurb: string;
  /** Residue index selected when the example is opened. */
  focus: number;
};

/** Bench examples. The live site's examples stay first, in that order. */
export const EXAMPLES: readonly Example[] = [
  {
    id: "enk",
    name: "Leu-enkephalin",
    seq: "YGGFL",
    window: 1,
    blurb: "Five residues. Small enough to inspect every side chain.",
    focus: 0,
  },
  {
    id: "sp",
    name: "Substance P",
    seq: "RPKPQQFFGLM",
    window: 1,
    blurb: "Eleven-residue neuropeptide. Mixed charge and a proline kink.",
    focus: 0,
  },
  {
    id: "oxy",
    name: "Oxytocin",
    seq: "CYIQNCPLG",
    window: 1,
    blurb: "Nine residues. Two cysteines can lock a disulfide ring.",
    focus: 0,
  },
  {
    id: "ins",
    name: "Insulin B",
    seq: "FVNQHLCGSHLVEALYLVCGERGFFYTPKT",
    window: 7,
    blurb: "Human insulin B chain, 30 residues.",
    focus: 0,
  },
  {
    id: "sema",
    name: "Semaglutide",
    seq: SEMAGLUTIDE,
    window: 7,
    blurb: "31 residues. Three sites carry a note the plain residue card does not.",
    focus: 1,
  },
  {
    id: "tirz",
    name: "Tirzepatide",
    seq: TIRZEPATIDE,
    window: 7,
    blurb:
      "39 residues. A GIP and GLP-1 receptor agonist with two Aib sites, a C20 diacid on Lys20, and a C-terminal amide.",
    focus: 1,
  },
  {
    id: "reta",
    name: "Retatrutide",
    seq: RETATRUTIDE,
    window: 7,
    blurb:
      "39 residues. An investigational GIP, GLP-1, and glucagon receptor agonist. Aib at 2 and 20, α-methyl-Leu at 13, a C20 diacid on Lys17.",
    focus: 1,
  },
  {
    id: "lira",
    name: "Liraglutide",
    seq: LIRAGLUTIDE,
    window: 7,
    blurb:
      "31 residues. A GLP-1 receptor agonist. Palmitoyl-γGlu on Lys20 (Lys26 of the GLP-1 precursor) and Arg at position 28 (Lys34 of that precursor).",
    focus: 19,
  },
  {
    id: "exe",
    name: "Exenatide",
    seq: EXENATIDE,
    window: 7,
    blurb:
      "39 residues. A synthetic GLP-1 receptor agonist. The side chains are unmodified, and Ser39 is a C-terminal amide.",
    focus: 38,
  },
  {
    id: "teri",
    name: "Teriparatide",
    // Human PTH(1–34), free termini, no side-chain edit, so no MODIFIED_PEPTIDES entry.
    // Sequence: PubChem CID 16133850, https://pubchem.ncbi.nlm.nih.gov/compound/16133850
    //   H-Ser-Val-Ser-Glu-Ile-Gln-Leu-Met-His-Asn-Leu-Gly-Lys-His-Leu-Asn-Ser-Met-Glu-Arg-Val-Glu-Trp-Leu-Arg-Lys-Lys-Leu-Gln-Asp-Val-His-Asn-Phe-OH
    // Formula C181H291N55O51S2 and average MW 4117.8 Da: Forteo label, section 11,
    // https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/021318s057lbl.pdf
    // Bare chain 4117.7595 is 0.0405 Da under 4117.8.
    seq: "SVSEIQLMHNLGKHLNSMERVEWLRKKLQDVHNF",
    window: 7,
    blurb:
      "34 residues. Recombinant human parathyroid hormone 1–34, the N-terminal sequence of human PTH, with free termini and no side-chain edits.",
    focus: 0,
  },
  {
    id: "biv",
    name: "Bivalirudin",
    seq: BIVALIRUDIN,
    window: 7,
    blurb:
      "20 residues. A synthetic direct thrombin inhibitor. Position 1 is D-phenylalanine, shown on the phenylalanine card.",
    focus: 0,
  },
];
