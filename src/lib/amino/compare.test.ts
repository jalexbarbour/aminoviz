import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./chemistry.ts";
import {
  chainStats,
  compareExampleChoices,
  compareSequences,
  DEFAULT_COMPARE_IDS,
  modificationTags,
  positionModification,
  sequencesForExampleIds,
  type PositionModification,
} from "./compare.ts";
import { BIVALIRUDIN, LIRAGLUTIDE, RETATRUTIDE, SEMAGLUTIDE, TIRZEPATIDE } from "./modified.ts";
import { standInAt } from "./stand-ins.ts";

function at(raws: readonly string[], position: number) {
  const result = compareSequences(raws, 7.4);
  const column = result.positions[position - 1];
  assert.ok(column, `missing position ${position}`);
  assert.equal(column.position, position);
  return column;
}

function tags(modification: PositionModification | null): string[] {
  assert.ok(modification);
  return modificationTags(modification);
}

function hasKind(
  modification: PositionModification | null | undefined,
  kind: PositionModification["kinds"][number],
): boolean {
  return modification?.kinds.includes(kind) ?? false;
}

describe("aligned by position", () => {
  it("does not shift residues to maximize matches", () => {
    const { positions } = compareSequences(["AGC", "AXGC"], 7.4);
    assert.deepEqual(
      positions.map((column) => column.cells.map((cell) => cell.letter)),
      [
        ["A", "A"],
        ["G", "X"],
        ["C", "G"],
        [null, "C"],
      ],
    );
    assert.deepEqual(
      positions.map((column) => column.differs),
      [false, true, true, true],
    );
  });

  it("treats a chain that has ended as a difference, and ignores a blank chain", () => {
    const gapped = compareSequences(["YGG", "YGGFL"], 7.4);
    assert.equal(gapped.positions[0]?.differs, false);
    assert.equal(gapped.positions[3]?.cells[0]?.letter, null);
    assert.equal(gapped.positions[3]?.cells[1]?.letter, "F");
    assert.equal(gapped.positions[3]?.differs, true);

    const blank = compareSequences(["YGGFL", ""], 7.4);
    assert.equal(blank.chains[1]?.empty, true);
    assert.equal(blank.chains[1]?.stats, null);
    assert.ok(blank.positions.every((column) => column.differs === false));
  });

  it("drops an unreadable sequence out of the diff and keeps the parse error", () => {
    const result = compareSequences(["YGGFL", "YGGFLB"], 7.4);
    assert.match(result.chains[1]?.error ?? "", /not a coded amino acid/);
    assert.equal(result.chains[1]?.stats, null);
    assert.equal(result.positions.length, 5);
    assert.ok(result.positions.every((column) => column.differs === false));
    assert.ok(result.positions.every((column) => column.highlighted === false));
  });
});

describe("Semaglutide and Tirzepatide", () => {
  const raws = [SEMAGLUTIDE, TIRZEPATIDE];

  it("marks position 2 as Aib in both, without calling the residues different", () => {
    const column = at(raws, 2);
    assert.equal(column.differs, false);
    assert.equal(column.highlighted, true);
    assert.deepEqual(
      column.cells.map((cell) => cell.letter),
      ["X", "X"],
    );
    for (const cell of column.cells) {
      assert.ok(cell.modification?.kinds.includes("aib"));
      assert.match(cell.modification?.note?.text ?? "", /Aib/);
      assert.match(cell.modification?.note?.text ?? "", /position 2/);
      assert.deepEqual(tags(cell.modification), ["Aib", "alanine stand-in"]);
    }
  });

  it("puts the acylated lysine at position 20 in both", () => {
    const column = at(raws, 20);
    assert.equal(column.differs, false);
    assert.deepEqual(
      column.cells.map((cell) => cell.letter),
      ["K", "K"],
    );
    for (const cell of column.cells) {
      assert.ok(cell.modification?.kinds.includes("acylated-lysine"));
      assert.equal(cell.modification?.kinds.includes("aib"), false);
      assert.match(cell.modification?.note?.text ?? "", /position 20/);
      assert.deepEqual(tags(cell.modification), ["Acylated lysine"]);
    }
  });

  it("still highlights a note that is not a chemical stand-in", () => {
    const column = at(raws, 28);
    assert.equal(column.cells[0]?.letter, "R");
    assert.deepEqual(column.cells[0]?.modification?.kinds, ["note"]);
    assert.deepEqual(tags(column.cells[0]?.modification ?? null), ["Note"]);
    assert.equal(column.cells[1]?.modification, null);
  });
});

describe("Retatrutide", () => {
  it("puts the acylated lysine at position 17", () => {
    const column = at([RETATRUTIDE, RETATRUTIDE], 17);
    assert.equal(column.position, 17);
    assert.equal(column.differs, false);
    for (const cell of column.cells) {
      assert.equal(cell.letter, "K");
      assert.ok(cell.modification?.kinds.includes("acylated-lysine"));
      assert.match(cell.modification?.note?.text ?? "", /position 17/);
      assert.deepEqual(tags(cell.modification), ["Acylated lysine"]);
    }
  });

  it("keeps position 20 as Aib and position 13 as a leucine stand-in", () => {
    const aib = positionModification([...RETATRUTIDE], 19);
    assert.equal(aib?.kinds.includes("aib"), true);
    assert.equal(aib?.kinds.includes("acylated-lysine"), false);
    assert.deepEqual(tags(aib), ["Aib", "alanine stand-in"]);

    const methyl = at([RETATRUTIDE], 13);
    assert.equal(methyl.cells[0]?.letter, "L");
    assert.equal(methyl.cells[0]?.modification?.kinds.includes("aib"), false);
    assert.equal(methyl.cells[0]?.modification?.kinds.includes("stand-in"), true);
    assert.deepEqual(tags(methyl.cells[0]?.modification ?? null), ["leucine stand-in"]);
  });

  it("marks the C-terminal amide on the incretins and not on semaglutide", () => {
    const incretins = at([TIRZEPATIDE, RETATRUTIDE], 39);
    assert.equal(incretins.differs, false);
    for (const cell of incretins.cells) {
      assert.ok(cell.modification?.kinds.includes("c-terminal-amide"));
      assert.match(cell.modification?.note?.text ?? "", /C-terminal amide/);
      assert.deepEqual(tags(cell.modification), ["C-terminal amide"]);
    }
    const semaEnd = at([SEMAGLUTIDE], 31);
    assert.equal(semaEnd.cells[0]?.letter, "G");
    assert.equal(semaEnd.cells[0]?.modification, null);
  });
});

describe("default trio", () => {
  it("opens on semaglutide, tirzepatide, and retatrutide", () => {
    const raws = sequencesForExampleIds(DEFAULT_COMPARE_IDS);
    assert.deepEqual(DEFAULT_COMPARE_IDS, ["sema", "tirz", "reta"]);
    assert.deepEqual(raws, [SEMAGLUTIDE, TIRZEPATIDE, RETATRUTIDE]);

    const position2 = at(raws, 2);
    assert.equal(position2.differs, false);
    assert.ok(position2.cells.every((cell) => cell.modification?.kinds.includes("aib")));

    const position20 = at(raws, 20);
    assert.equal(position20.differs, true);
    assert.equal(position20.cells[0]?.modification?.kinds.includes("acylated-lysine"), true);
    assert.equal(position20.cells[1]?.modification?.kinds.includes("acylated-lysine"), true);
    assert.equal(position20.cells[2]?.modification?.kinds.includes("aib"), true);
    assert.equal(position20.cells[2]?.modification?.kinds.includes("acylated-lysine"), false);

    const position17 = at(raws, 17);
    assert.equal(position17.cells[2]?.letter, "K");
    assert.equal(hasKind(position17.cells[2]?.modification, "acylated-lysine"), true);
    assert.equal(hasKind(position17.cells[0]?.modification, "acylated-lysine"), false);
    assert.equal(hasKind(position17.cells[1]?.modification, "acylated-lysine"), false);
  });
});

describe("stand-in rings agree with standInAt", () => {
  it("marks Bivalirudin D-Phe at position 1 and leaves a plain phenylalanine alone", () => {
    const column = at([BIVALIRUDIN], 1);
    assert.equal(column.position, 1);
    assert.equal(column.cells[0]?.letter, "F");
    const standIn = column.cells[0]?.modification?.standIn ?? null;
    assert.ok(standIn);
    assert.equal(standIn.index, 0);
    assert.equal(standIn.accessibleLabel, "phenylalanine stand-in");
    assert.deepEqual(standIn, standInAt([...BIVALIRUDIN], 0));
    assert.equal(column.cells[0]?.modification?.kinds.includes("stand-in"), true);
    assert.deepEqual(tags(column.cells[0]?.modification ?? null), ["phenylalanine stand-in"]);
    assert.equal(positionModification(["F"], 0), null);
    assert.equal(standInAt(["F"], 0), null);
  });

  it("does not treat liraglutide's acylated lysine as a stand-in", () => {
    const column = at([LIRAGLUTIDE], 20);
    assert.equal(column.cells[0]?.letter, "K");
    assert.equal(column.cells[0]?.modification?.standIn, null);
    assert.equal(column.cells[0]?.modification?.kinds.includes("acylated-lysine"), true);
    assert.equal(standInAt([...LIRAGLUTIDE], 19), null);
  });
});

describe("example picker", () => {
  it("offers all 11 bench examples, including the four added on main", () => {
    assert.deepEqual(
      compareExampleChoices().map((example) => example.id),
      ["enk", "sp", "oxy", "ins", "sema", "tirz", "reta", "lira", "exe", "teri", "biv"],
    );
    assert.deepEqual(
      compareExampleChoices().map((example) => example.name),
      [
        "Leu-enkephalin",
        "Substance P",
        "Oxytocin",
        "Insulin B",
        "Semaglutide",
        "Tirzepatide",
        "Retatrutide",
        "Liraglutide",
        "Exenatide",
        "Teriparatide",
        "Bivalirudin",
      ],
    );
  });
});

describe("summary from analyze()", () => {
  it("copies length, mass, charge, pI, and GRAVY at the requested pH", () => {
    for (const pH of [5, 7.4]) {
      for (const sequence of [SEMAGLUTIDE, TIRZEPATIDE, RETATRUTIDE, "YGGFL"]) {
        const letters = [...sequence];
        const stats = chainStats(letters, pH);
        const model = analyze(letters, pH, 1);
        assert.equal(stats.length, model.length);
        assert.equal(stats.mass, model.mass);
        assert.equal(stats.charge, model.charge);
        assert.equal(stats.pI, model.pI);
        assert.equal(stats.gravy, model.gravy);
      }
    }
    const neutral = chainStats([...SEMAGLUTIDE], 7.4);
    const acidic = chainStats([...SEMAGLUTIDE], 5);
    assert.equal(neutral.mass, acidic.mass);
    assert.notEqual(neutral.charge, acidic.charge);
    assert.equal(neutral.mass.toFixed(1), "4113.6");
  });

  it("leaves stats empty until the sequence parses", () => {
    const result = compareSequences(["", "not-a-residue"], 7.4);
    assert.equal(result.chains[0]?.stats, null);
    assert.equal(result.chains[1]?.stats, null);
    assert.equal(result.positions.length, 0);
  });
});
