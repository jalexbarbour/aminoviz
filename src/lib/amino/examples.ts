import { RETATRUTIDE, SEMAGLUTIDE, TIRZEPATIDE } from "./modified.ts";

export type Example = {
  id: string;
  name: string;
  seq: string;
  window: number;
  blurb: string;
  /** Residue index selected when the example is opened. */
  focus: number;
};

/** Bench examples, in the order the live site shows them. */
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
];
