import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { analyze } from "./chemistry.ts";
import { EXAMPLES } from "./examples.ts";
import { modifiedPeptide, residueNote, SEMAGLUTIDE } from "./modified.ts";
import { RESIDUES, WATER_DA } from "./residues.ts";

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

function bareChainMass(seq: string): number {
  return [...seq].reduce((sum, letter) => sum + RESIDUES[letter]!.mass, 0) + WATER_DA;
}

describe("live bundle parity", () => {
  it("keeps the live examples first, in the same order", () => {
    assert.deepEqual(
      EXAMPLES.slice(0, legacy.nA.length).map((example) => example.name),
      legacy.nA.map((example) => example.name),
    );
    assert.deepEqual(
      EXAMPLES.slice(0, legacy.nA.length).map((example) => example.seq),
      legacy.nA.map((example) => example.seq),
    );
    assert.deepEqual(
      EXAMPLES.slice(legacy.nA.length).map((example) => example.id),
      ["lira", "exe", "teri", "biv"],
    );
  });

  for (const example of EXAMPLES) {
    if (!legacy.nA.some((item) => item.seq === example.seq)) continue;
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
      if (!legacy.nA.some((item) => item.seq === example.seq)) continue;
      const live = legacy.zk(letters);
      assert.ok(live);
      const notes = live.n ?? legacy.rA;
      for (const [index, note] of Object.entries(notes)) {
        assert.deepEqual(residueNote(letters, Number(index)), note, example.name);
      }
    }
  });
});

/** Published average molecular weights cited beside the new entries. */
const PUBLISHED_AVERAGE_MW: Record<string, number> = {
  lira: 3751.2,
  exe: 4186.6,
  teri: 4117.8,
  biv: 2180.32,
};

describe("new annotated examples", () => {
  for (const [id, published] of Object.entries(PUBLISHED_AVERAGE_MW)) {
    it(`${id}: displayed mass is the published average within 0.05 Da`, () => {
      const example = EXAMPLES.find((item) => item.id === id);
      assert.ok(example);
      const letters = [...example.seq];
      const peptide = modifiedPeptide(letters);
      const bare = bareChainMass(example.seq);
      const displayed = analyze(letters, 7, example.window).mass;
      const gap = Math.abs(displayed - published);
      assert.ok(gap <= 0.05, `${example.name}: ${displayed} vs ${published} (gap ${gap})`);
      if (peptide) {
        assert.ok(
          Math.abs(peptide.adductMass - (published - bare)) < 0.0001,
          `${example.name} adduct ${peptide.adductMass} vs ${published - bare}`,
        );
      } else {
        assert.ok(Math.abs(bare - published) <= 0.05);
      }
      for (let index = 0; index < letters.length; index++) {
        assert.deepEqual(residueNote(letters, index), peptide?.notes[index] ?? null, `${id}:${index}`);
      }
    });
  }

  it("places palmitoyl-γGlu on liraglutide Lys26 and arginine at position 34", () => {
    const example = EXAMPLES.find((item) => item.id === "lira")!;
    const letters = [...example.seq];
    assert.equal(letters.length, 31);
    assert.equal(letters[19], "K");
    assert.equal(letters[27], "R");
    assert.equal(example.focus, 19);
    const peptide = modifiedPeptide(letters)!;
    assert.equal(peptide.lysineIndex, 19);
    assert.equal(peptide.cTerminalAmide, false);
    assert.deepEqual(
      peptide.carboxylates.map((group) => ({ label: group.label, pKa: group.pKa })),
      [{ label: "Lys20 · spacer carboxyl", pKa: 2.19 }],
    );
    const model = analyze(letters, 7, example.window);
    assert.deepEqual(
      model.groups
        .filter((group) => group.label.startsWith("Lys20"))
        .map((group) => ({ label: group.label, pKa: group.pKa, kind: group.kind })),
      [{ label: "Lys20 · spacer carboxyl", pKa: 2.19, kind: "acid" }],
    );
    assert.equal(model.groups.some((group) => group.id === "K-19"), false);
    assert.equal(residueNote(letters, 19)?.sideChain, "—(CH₂)₄—NH—γGlu–palmitoyl");
  });

  it("keeps exenatide unmodified except for the C-terminal amide", () => {
    const example = EXAMPLES.find((item) => item.id === "exe")!;
    const letters = [...example.seq];
    assert.equal(letters.length, 39);
    assert.equal(example.focus, 38);
    const peptide = modifiedPeptide(letters)!;
    assert.equal(peptide.lysineIndex, -1);
    assert.equal(peptide.cTerminalAmide, true);
    assert.deepEqual(peptide.carboxylates, []);
    assert.deepEqual(peptide.standIns, {});
    const model = analyze(letters, 7, example.window);
    assert.equal(model.groups.some((group) => group.id === "c-term"), false);
    assert.equal(model.groups.some((group) => group.id === "K-11" && group.kind === "base"), true);
    assert.equal(model.groups.some((group) => group.id === "K-26" && group.kind === "base"), true);
  });

  it("leaves teriparatide as an unmodified free-acid chain", () => {
    const example = EXAMPLES.find((item) => item.id === "teri")!;
    assert.equal(example.seq, "SVSEIQLMHNLGKHLNSMERVEWLRKKLQDVHNF");
    assert.equal(example.seq.length, 34);
    assert.equal(example.focus, 0);
    assert.equal(modifiedPeptide([...example.seq]), null);
    const model = analyze([...example.seq], 7, example.window);
    assert.equal(model.groups.some((group) => group.id === "c-term"), true);
  });

  it("draws bivalirudin D-Phe on the phenylalanine card", () => {
    const example = EXAMPLES.find((item) => item.id === "biv")!;
    const letters = [...example.seq];
    assert.equal(letters[0], "F");
    assert.equal(letters.length, 20);
    assert.equal(example.focus, 0);
    const peptide = modifiedPeptide(letters)!;
    assert.deepEqual(peptide.standIns[0], {
      letter: "F",
      copiedFrom: "F",
      label: "phenylalanine",
    });
    assert.equal(peptide.cTerminalAmide, false);
    assert.deepEqual(peptide.carboxylates, []);
    assert.match(residueNote(letters, 0)?.text ?? "", /phenylalanine stand-ins/);
    const model = analyze(letters, 7, example.window);
    assert.equal(model.groups.some((group) => group.id === "c-term"), true);
  });
});
