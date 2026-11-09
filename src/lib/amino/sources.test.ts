import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAMPLES } from "./examples.ts";
import { SOURCES, sourcesForExample } from "./sources.ts";

describe("sources", () => {
  it("gives every example id at least one https source", () => {
    assert.ok(EXAMPLES.length > 0);
    for (const example of EXAMPLES) {
      const sources = sourcesForExample(example.id);
      assert.ok(sources.length >= 1, `${example.id} has no sources`);
      assert.equal(sources, SOURCES[example.id]);
      for (const source of sources) {
        assert.match(source.url, /^https:\/\//, `${example.id} ${source.label}`);
        assert.ok(source.label.trim().length > 0);
      }
    }
  });

  it("only cites example ids that exist", () => {
    const ids = new Set(EXAMPLES.map((example) => example.id));
    for (const id of Object.keys(SOURCES)) {
      assert.ok(ids.has(id), id);
    }
  });

  it("points each peptide at the PubChem compound that was checked", () => {
    const cid: Record<string, string> = {
      enk: "461776",
      sp: "36511",
      oxy: "439302",
      ins: "118984375",
      sema: "56843331",
      tirz: "166567236",
      reta: "171390338",
    };
    for (const [id, compound] of Object.entries(cid)) {
      assert.ok(
        sourcesForExample(id).some(
          (source) => source.url === `https://pubchem.ncbi.nlm.nih.gov/compound/${compound}`,
        ),
        id,
      );
    }
  });

  it("cites the FDA GSRS record for semaglutide, tirzepatide, and retatrutide", () => {
    const unii: Record<string, string> = {
      sema: "53AXN4NNHX",
      tirz: "OYN3CCI6QE",
      reta: "NOP2Y096GV",
    };
    for (const [id, code] of Object.entries(unii)) {
      assert.ok(
        sourcesForExample(id).some(
          (source) =>
            source.url === `https://precision.fda.gov/ginas/app/ui/substances/${code}`,
        ),
        id,
      );
    }
  });
});
