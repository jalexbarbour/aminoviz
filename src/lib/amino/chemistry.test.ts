import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { analyze } from "./chemistry.ts";
import { EXAMPLES } from "./examples.ts";
import { modifiedPeptide, residueNote, SEMAGLUTIDE } from "./modified.ts";
import { RESIDUES } from "./residues.ts";

type LegacyGroup = { id: string; label: string; pKa: number; kind: string; charge: number };
type LegacyModel = {
  mass: number;
  charge: number;
  pI: number;
  gravy: number;
  groups: LegacyGroup[];
};
type LegacyNote = { text: string; sideChain?: string };
type LegacyPeptide = { n: Record<string, LegacyNote> | null };
type LegacyApi = {
  $k: (letters: string[], pH: number, window: number) => LegacyModel;
  nA: { id: string; name: string; seq: string }[];
  zk: (letters: string[]) => LegacyPeptide | null;
  rA: Record<string, LegacyNote>;
  Dk: Record<string, { kd: number; helix: number; sheet: number; turn: number; bend: number[]; mass: number }>;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadLegacy(): LegacyApi {
  const source = readFileSync(resolve(root, "deployed/assets/routes-DGnHLI9c.js"), "utf8");
  const constants = source.slice(source.indexOf("wk=18.0153"), source.indexOf(";Object.keys(Dk)"));
  const chemistry = source.slice(source.indexOf("var Ok="), source.indexOf("var tA="));
  const notesStart = source.indexOf("rA={1:");
  const notes = source.slice(notesStart, source.indexOf("var aA="));
  const examples = source.slice(source.indexOf("nA=[{id:`enk`"), notesStart - 1);
  return new Function(
    `var ${constants};${chemistry};var ${examples};var ${notes};return {$k,nA,zk,rA,Dk};`,
  )() as LegacyApi;
}

const legacy = loadLegacy();

function close(actual: number, expected: number, label: string) {
  const gap = Math.abs(actual - expected);
  assert.ok(gap < 1e-6, `${label}: source ${actual} vs live ${expected} (gap ${gap})`);
}

describe("live bundle parity", () => {
  it("covers the same examples, in the same order", () => {
    assert.deepEqual(
      EXAMPLES.map((example) => example.name),
      legacy.nA.map((example) => example.name),
    );
    assert.deepEqual(
      EXAMPLES.map((example) => example.seq),
      legacy.nA.map((example) => example.seq),
    );
  });

  for (const example of EXAMPLES) {
    it(`${example.name}: mass, charge at pH 7, pI, and GRAVY`, () => {
      const letters = [...example.seq];
      const live = legacy.$k(letters, 7, example.window);
      const source = analyze(letters, 7, example.window);
      close(source.mass, live.mass, `${example.name} mass`);
      close(source.charge, live.charge, `${example.name} charge`);
      close(source.pI, live.pI, `${example.name} pI`);
      close(source.gravy, live.gravy, `${example.name} GRAVY`);
    });
  }
});

describe("published masses", () => {
  it("keeps Semaglutide near 4113.6 Da and the two incretins at their live masses", () => {
    const mass = (id: string) => {
      const example = EXAMPLES.find((item) => item.id === id)!;
      return analyze([...example.seq], 7, example.window).mass;
    };
    assert.equal(mass("sema").toFixed(1), "4113.6");
    assert.equal(mass("tirz").toFixed(2), "4813.45");
    assert.equal(mass("reta").toFixed(2), "4731.35");
  });
});

describe("Semaglutide rules", () => {
  const letters = [...SEMAGLUTIDE];
  const model = analyze(letters, 7, 7);

  it("does not count Lys20 as a +1 and adds two carboxylates", () => {
    const lys = model.groups.filter((group) => group.label.startsWith("Lys20"));
    assert.deepEqual(
      lys.map((group) => ({ label: group.label, pKa: group.pKa, kind: group.kind })),
      [
        { label: "Lys20 · spacer carboxyl", pKa: 2.19, kind: "acid" },
        { label: "Lys20 · C18 diacid", pKa: 4.9, kind: "acid" },
      ],
    );
    assert.equal(
      model.groups.some((group) => group.id === "K-19" || group.label === "Lys20 · Lysine"),
      false,
    );
  });

  it("shows the C18 diacid side chain and the three live notes", () => {
    assert.equal(residueNote(letters, 19)?.sideChain, "—(CH₂)₄—NH—C18 diacid");
    const live = legacy.zk(letters);
    assert.ok(live);
    const notes = live.n ?? legacy.rA;
    for (const [index, note] of Object.entries(notes)) {
      assert.deepEqual(residueNote(letters, Number(index)), note);
    }
  });

  it("opens on position 2", () => {
    assert.equal(EXAMPLES.find((example) => example.id === "sema")?.focus, 1);
  });
});

describe("stand-ins", () => {
  it("uses alanine parameters for X and says so", () => {
    const aib = RESIDUES.X!;
    const alanine = RESIDUES.A!;
    assert.equal(aib.kd, alanine.kd);
    assert.equal(aib.helix, alanine.helix);
    assert.equal(aib.sheet, alanine.sheet);
    assert.equal(aib.turn, alanine.turn);
    assert.deepEqual(aib.bend, alanine.bend);
    assert.match(aib.note, /alanine stand-ins/);
    assert.equal(aib.mass, 85.1041);
  });

  it("records each modified peptide's stand-ins and matches the live wording", () => {
    for (const example of EXAMPLES) {
      const peptide = modifiedPeptide([...example.seq]);
      if (!peptide) continue;
      const letters = [...example.seq];
      for (const [key, standIn] of Object.entries(peptide.standIns)) {
        const index = Number(key);
        assert.equal(letters[index], standIn.letter);
        const shown = RESIDUES[standIn.letter]!;
        const source = RESIDUES[standIn.copiedFrom]!;
        assert.equal(shown.kd, source.kd);
        assert.equal(shown.helix, source.helix);
        assert.equal(shown.sheet, source.sheet);
        assert.equal(shown.turn, source.turn);
        const annotation = residueNote(letters, index);
        const label = `${annotation?.text ?? ""} ${shown.note}`;
        assert.match(label, new RegExp(`${standIn.label} stand-ins`));
      }
      const live = legacy.zk(letters);
      assert.ok(live);
      const notes = live.n ?? legacy.rA;
      for (const [index, note] of Object.entries(notes)) {
        assert.deepEqual(residueNote(letters, Number(index)), note, example.name);
      }
    }
  });
});
