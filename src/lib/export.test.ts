import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { describe, it } from "node:test";
import { analyze } from "./amino/chemistry.ts";
import {
  BIVALIRUDIN,
  residueNote,
  SEMAGLUTIDE,
  TIRZEPATIDE,
} from "./amino/modified.ts";
import { SOURCES } from "./amino/sources.ts";
import { standInAt, standInBadgeText } from "./amino/stand-ins.ts";
import {
  buildAnalysisCsv,
  buildCsv,
  escapeCsvField,
  exportBasename,
  propensityFlag,
} from "./export.ts";

/** RFC 4180 reader used to prove the builder round-trips notes. */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const char = src[i]!;
    if (quoted) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function dataRows(csv: string): { header: string[]; data: string[][] } {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex((row) => row[0] === "position");
  assert.ok(headerIndex > 0, "residue header should follow the summary");
  return { header: rows[headerIndex]!, data: rows.slice(headerIndex + 1) };
}

describe("CSV escaping", () => {
  it("quotes commas, doubles quotes, and keeps unicode", () => {
    assert.equal(escapeCsvField("plain"), "plain");
    assert.equal(escapeCsvField('α, "plain"'), '"α, ""plain"""');
    assert.equal(escapeCsvField('γ, "×"'), '"γ, ""×"""');
    assert.equal(escapeCsvField('say "hi"'), '"say ""hi"""');
    const field = 'He said "α, helix"\r\nnext';
    const csv = buildCsv([[field]]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.includes('"He said ""α, helix""\r\nnext"'));
    assert.deepEqual(parseCsv(csv), [[field]]);
    const bytes = Buffer.from(csv, "utf8");
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.ok(bytes.includes(Buffer.from("α", "utf8")));
  });
});

describe("Semaglutide CSV", () => {
  const letters = [...SEMAGLUTIDE];
  const model = analyze(letters, 7.4, 7);
  const csv = buildAnalysisCsv(model);

  it("starts with a UTF-8 BOM and uses CRLF records", () => {
    const bytes = Buffer.from(csv, "utf8");
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    const body = csv.slice(1);
    assert.equal(body.includes("\r\n"), true);
    assert.equal(body.replaceAll("\r\n", "").includes("\n"), false);
    assert.ok(body.startsWith("# Aminoviz peptide analysis."));
  });

  it("writes one row per residue, with the summary taken from analyze()", () => {
    const rows = parseCsv(csv);
    const summary = Object.fromEntries(
      rows.filter((row) => row.length === 2 && row[0] !== "position"),
    );
    assert.equal(summary.sequence, SEMAGLUTIDE);
    assert.equal(summary.pH, model.pH.toFixed(1));
    assert.equal(summary["total mass (Da)"], model.mass.toFixed(2));
    assert.equal(summary["net charge"], model.charge.toFixed(2));
    assert.equal(summary.pI, model.pI.toFixed(2));
    assert.equal(summary.GRAVY, model.gravy.toFixed(2));
    assert.equal(
      summary.sources,
      SOURCES.sema.map((source) => source.url).join(" "),
    );

    const { header, data } = dataRows(csv);
    assert.deepEqual(header, [
      "position",
      "one_letter",
      "three_letter",
      "name",
      "class",
      "residue_mass",
      "kyte_doolittle",
      "propensity",
      "structure_call",
      "stand_in",
      "note",
    ]);
    assert.equal(data.length, 31);
    assert.equal(data.length, letters.length);
    assert.deepEqual(
      data.map((row) => row[0]),
      letters.map((_, index) => String(index + 1)),
    );
  });

  it("escapes position notes and keeps the stand-in flag", () => {
    const { header, data } = dataRows(csv);
    const column = (name: string) => {
      const index = header.indexOf(name);
      assert.ok(index >= 0, name);
      return index;
    };
    const noteCol = column("note");
    const standCol = column("stand_in");
    const position2 = residueNote(letters, 1)?.text ?? "";
    assert.match(position2, /,/);
    assert.equal(data[1]![noteCol], position2);
    assert.ok(csv.includes(escapeCsvField(position2)));
    assert.equal(data[1]![column("one_letter")], "X");
    assert.equal(data[1]![column("three_letter")], "Aib");
    assert.match(data[1]![column("name")]!, /α-aminoisobutyric acid/);
    assert.equal(data[1]![column("class")], "Special");
    assert.equal(data[1]![column("propensity")], "helix");
    const semaStandIn = standInAt(letters, 1);
    assert.ok(semaStandIn);
    assert.equal(data[1]![standCol], standInBadgeText(semaStandIn.label));
    assert.equal(data[1]![standCol], "Ala");
    assert.equal(data.filter((row) => row[standCol] !== "no").length, 1);
    assert.equal(data.filter((row) => row[noteCol] !== "").length, 3);
    assert.equal(data[19]![noteCol], residueNote(letters, 19)?.text);
    assert.equal(data[27]![noteCol], residueNote(letters, 27)?.text);
    assert.equal(
      data[0]![column("kyte_doolittle")],
      model.residues[0]!.kd.toFixed(1),
    );
    assert.equal(data[0]![column("structure_call")], model.calls[0]);
    assert.equal(propensityFlag(model.residues[1]!), "helix");
  });
});

describe("unicode notes", () => {
  it("round-trips Tirzepatide commas, gamma, dash, and times", () => {
    const letters = [...TIRZEPATIDE];
    const model = analyze(letters, 7.4, 7);
    const note = residueNote(letters, 19)?.text ?? "";
    assert.match(note, /,/);
    assert.ok(note.includes("γ"));
    assert.ok(note.includes("–"));
    assert.ok(note.includes("×"));
    const csv = buildAnalysisCsv(model);
    const bytes = Buffer.from(csv, "utf8");
    assert.ok(bytes.includes(Buffer.from("γGlu–2×OEG", "utf8")));
    assert.equal(bytes.includes(Buffer.from("\\u03b3")), false);
    const { header, data } = dataRows(csv);
    assert.equal(data.length, letters.length);
    assert.equal(data[19]![header.indexOf("note")], note);
    assert.equal(data.length, 39);
  });
});

describe("stand-in badges and sources", () => {
  it("flags Bivalirudin position 1 with the phenylalanine badge", () => {
    const letters = [...BIVALIRUDIN];
    const csv = buildAnalysisCsv(analyze(letters, 7.4, 7));
    const { header, data } = dataRows(csv);
    const standCol = header.indexOf("stand_in");
    const hit = standInAt(letters, 0);
    assert.ok(hit);
    assert.equal(data[0]![standCol], standInBadgeText(hit.label));
    assert.equal(data[0]![standCol], "Phe");
    assert.equal(data.filter((row) => row[standCol] !== "no").length, 1);
    assert.equal(data.length, 20);
    const sources = parseCsv(csv).find((row) => row[0] === "sources");
    assert.equal(
      sources?.[1],
      SOURCES.biv.map((source) => source.url).join(" "),
    );
  });

  it("leaves sources empty when the chain is not an example", () => {
    const csv = buildAnalysisCsv(analyze(["A", "A"], 7, 1));
    const sources = parseCsv(csv).find((row) => row[0] === "sources");
    assert.deepEqual(sources, ["sources", ""]);
  });
});

describe("export filenames", () => {
  it("names files after the example or the sequence", () => {
    assert.equal(
      exportBasename("Semaglutide", [...SEMAGLUTIDE]),
      "aminoviz-semaglutide",
    );
    assert.equal(
      exportBasename("Leu-enkephalin", ["Y", "G", "G", "F", "L"]),
      "aminoviz-leu-enkephalin",
    );
    assert.equal(exportBasename("Insulin B", ["F", "V"]), "aminoviz-insulin-b");
    assert.equal(exportBasename("Substance P", ["R"]), "aminoviz-substance-p");
    assert.equal(
      exportBasename(null, ["Y", "G", "G", "F", "L"]),
      "aminoviz-yggfl",
    );
    assert.equal(
      exportBasename("  ", ["Y", "G", "G", "F", "L"]),
      "aminoviz-yggfl",
    );
    const long = Array.from({ length: 45 }, () => "A");
    assert.equal(exportBasename(null, long), `aminoviz-${"a".repeat(40)}-45`);
  });
});
