import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAMPLES } from "./examples.ts";
import { RESIDUES } from "./residues.ts";
import {
  standInAt,
  standInBadgeText,
  standInChartNote,
  standInHits,
} from "./stand-ins.ts";

function letters(id: string): string[] {
  const example = EXAMPLES.find((item) => item.id === id);
  assert.ok(example, id);
  return [...example.seq];
}

describe("stand-in detection", () => {
  it("marks semaglutide Aib with alanine numbers and leaves the other residues alone", () => {
    const seq = letters("sema");
    const hits = standInHits(seq);
    assert.deepEqual(
      hits.map((hit) => hit.index),
      [1],
    );
    assert.equal(hits[0]?.accessibleLabel, "alanine stand-in");
    assert.equal(hits[0]?.copiedFrom, "A");
    assert.equal(standInBadgeText(hits[0]!.label), "Ala");
    const shown = RESIDUES[seq[1]!]!;
    const alanine = RESIDUES.A!;
    assert.equal(shown.kd, alanine.kd);
    assert.equal(shown.helix, alanine.helix);
    assert.equal(shown.sheet, alanine.sheet);
    assert.equal(shown.turn, alanine.turn);
    assert.equal(standInAt(seq, 19), null);
    assert.equal(standInAt(seq, 0), null);
  });

  it("marks both tirzepatide Aib sites as alanine stand-ins", () => {
    const hits = standInHits(letters("tirz"));
    assert.deepEqual(
      hits.map((hit) => ({ index: hit.index, label: hit.accessibleLabel })),
      [
        { index: 1, label: "alanine stand-in" },
        { index: 12, label: "alanine stand-in" },
      ],
    );
  });

  it("marks retatrutide Aib sites and the α-methyl-Leu at position 13", () => {
    const seq = letters("reta");
    const hits = standInHits(seq);
    assert.deepEqual(
      hits.map((hit) => ({
        index: hit.index,
        letter: hit.letter,
        copiedFrom: hit.copiedFrom,
        label: hit.accessibleLabel,
      })),
      [
        { index: 1, letter: "X", copiedFrom: "A", label: "alanine stand-in" },
        { index: 12, letter: "L", copiedFrom: "L", label: "leucine stand-in" },
        { index: 19, letter: "X", copiedFrom: "A", label: "alanine stand-in" },
      ],
    );
    assert.equal(seq[12], "L");
    assert.equal(RESIDUES[seq[12]!]!.kd, RESIDUES.L!.kd);
    assert.equal(RESIDUES[seq[12]!]!.helix, RESIDUES.L!.helix);
    assert.equal(standInAt(seq, 13), null);
    assert.equal(standInBadgeText("leucine"), "Leu");
  });

  it("finds no stand-ins on unmodified examples or a plain leucine chain", () => {
    for (const id of ["enk", "sp", "oxy", "ins"]) {
      assert.deepEqual(standInHits(letters(id)), [], id);
    }
    assert.deepEqual(standInHits(["L", "L", "L"]), []);
    assert.equal(standInAt(["X"], 0), null);
  });

  it("names the chart positions without inventing a chemistry value", () => {
    assert.match(standInChartNote(standInHits(letters("sema"))), /Position 2 is an alanine stand-in/);
    assert.match(standInChartNote(standInHits(letters("reta"))), /Positions 2 and 20 are alanine stand-ins/);
    assert.match(standInChartNote(standInHits(letters("reta"))), /Position 13 is a leucine stand-in/);
    assert.match(standInChartNote(standInHits(letters("reta"))), /Hollow rings/);
    assert.equal(standInChartNote([]), "");
  });
});
