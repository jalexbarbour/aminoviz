/**
 * Citations for the bench examples, keyed by example id.
 * This is the only place those links live. Add to it when an example is added.
 */
export type SourceLink = {
  label: string;
  url: string;
};

export const SOURCES: Record<string, readonly SourceLink[]> = {
  enk: [
    {
      label: "PubChem CID 461776",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/461776",
    },
  ],
  sp: [
    {
      label: "PubChem CID 36511",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/36511",
    },
  ],
  oxy: [
    {
      label: "PubChem CID 439302",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/439302",
    },
  ],
  ins: [
    {
      label: "PubChem CID 118984375",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/118984375",
    },
  ],
  sema: [
    {
      label: "PubChem CID 56843331",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/56843331",
    },
    {
      label: "FDA GSRS UNII 53AXN4NNHX",
      url: "https://precision.fda.gov/ginas/app/ui/substances/53AXN4NNHX",
    },
  ],
  tirz: [
    {
      label: "PubChem CID 166567236",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/166567236",
    },
    {
      label: "FDA GSRS UNII OYN3CCI6QE",
      url: "https://precision.fda.gov/ginas/app/ui/substances/OYN3CCI6QE",
    },
  ],
  reta: [
    {
      label: "PubChem CID 171390338",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/171390338",
    },
    {
      label: "FDA GSRS UNII NOP2Y096GV",
      url: "https://precision.fda.gov/ginas/app/ui/substances/NOP2Y096GV",
    },
  ],
  lira: [
    {
      label: "PubChem CID 16134956",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/16134956",
    },
  ],
  exe: [
    {
      label: "PubChem CID 45588096",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/45588096",
    },
  ],
  teri: [
    {
      label: "PubChem CID 16133850",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/16133850",
    },
  ],
  biv: [
    {
      label: "PubChem CID 16129704",
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/16129704",
    },
  ],
};

export function sourcesForExample(id: string): readonly SourceLink[] {
  return SOURCES[id] ?? [];
}
