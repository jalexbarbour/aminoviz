import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAMPLES } from "./amino/examples.ts";
import { exportBasename } from "./export.ts";
import {
  DEFAULT_BENCH_STATE,
  benchHistoryUrl,
  benchShareHref,
  parseBenchSearch,
  serializeBenchSearch,
  type BenchUrlState,
} from "./url-state.ts";

const LETTERS = /^[ACDEFGHIKLMNPQRSTVWXY]+$/;
const sema = EXAMPLES.find((example) => example.id === "sema")!;

function roundTrip(state: BenchUrlState): BenchUrlState {
  const search = serializeBenchSearch(state);
  assert.notEqual(search, null);
  return parseBenchSearch(search ?? "");
}

describe("parseBenchSearch", () => {
  it("keeps the default bench when there are no params", () => {
    assert.deepEqual(parseBenchSearch(""), DEFAULT_BENCH_STATE);
    assert.deepEqual(parseBenchSearch("?"), DEFAULT_BENCH_STATE);
  });

  it("opens Semaglutide on position 2 when pos is omitted", () => {
    assert.equal(sema.focus, 1);
    const state = parseBenchSearch("?ex=sema");
    assert.equal(state.exampleId, "sema");
    assert.equal(state.raw, sema.seq);
    assert.equal(state.selected, 1);
    assert.equal(state.pH, 7.4);
    assert.equal(state.windowSize, sema.window);
  });

  it("reads the documented example and sequence links", () => {
    const shared = parseBenchSearch("?ex=sema&pos=20&ph=7.4");
    assert.equal(shared.exampleId, "sema");
    assert.equal(shared.raw, sema.seq);
    assert.equal(shared.selected, 19);
    assert.equal(shared.pH, 7.4);
    assert.equal(shared.windowSize, 7);

    const chain = parseBenchSearch("?seq=YGGFL&pos=3");
    assert.equal(chain.raw, "YGGFL");
    assert.equal(chain.exampleId, "enk");
    assert.equal(chain.selected, 2);
    assert.equal(chain.pH, 7.4);
    assert.equal(chain.windowSize, 1);
  });

  it("uses each example's own focus and window when those params are absent", () => {
    for (const example of EXAMPLES) {
      const state = parseBenchSearch(`?ex=${example.id}`);
      assert.equal(state.raw, example.seq);
      assert.equal(state.selected, example.focus);
      assert.equal(state.windowSize, example.window);
      assert.equal(state.exampleId, example.id);
    }
  });

  it("lets a known example id win over seq", () => {
    const state = parseBenchSearch("?ex=sema&seq=YGGFL&pos=20");
    assert.equal(state.exampleId, "sema");
    assert.equal(state.raw, sema.seq);
    assert.equal(state.selected, 19);
  });

  it("falls back quietly when values are invalid or out of range", () => {
    assert.deepEqual(parseBenchSearch("?ex=SEMA"), DEFAULT_BENCH_STATE);
    assert.deepEqual(
      parseBenchSearch("?ex=nope&seq=123&pos=no&ph=no&w=no"),
      DEFAULT_BENCH_STATE,
    );
    assert.deepEqual(
      parseBenchSearch("?seq=BZ&pos=0&ph=-1&w=2"),
      DEFAULT_BENCH_STATE,
    );

    const semaDefaults = parseBenchSearch("?ex=sema&pos=0&ph=99&w=4");
    assert.equal(semaDefaults.selected, sema.focus);
    assert.equal(semaDefaults.pH, 7.4);
    assert.equal(semaDefaults.windowSize, sema.window);

    const short = parseBenchSearch("?seq=YGGFL&pos=99&w=9&ph=14.06");
    assert.equal(short.selected, 0);
    assert.equal(short.windowSize, 1);
    assert.equal(short.pH, 7.4);

    assert.equal(parseBenchSearch("?ph=15").pH, 7.4);
    assert.equal(parseBenchSearch("?ph=-0.1").pH, 7.4);
    assert.equal(parseBenchSearch("?pos=1.5").selected, 0);
    assert.equal(parseBenchSearch("?pos=-3").selected, 0);
    assert.equal(parseBenchSearch("?w=11").windowSize, 1);
  });

  it("accepts in-range pH, position, and window, including the edges", () => {
    const state = parseBenchSearch("?seq=AAAAAAAAA&pos=9&ph=0&w=9");
    assert.equal(state.raw, "AAAAAAAAA");
    assert.equal(state.exampleId, "");
    assert.equal(state.selected, 8);
    assert.equal(state.pH, 0);
    assert.equal(state.windowSize, 9);
    assert.equal(parseBenchSearch("?ph=14").pH, 14);
    assert.equal(parseBenchSearch("?ph=7.44").pH, 7.4);
    assert.equal(parseBenchSearch("?ph=%207.45").pH, 7.5);
    assert.equal(parseBenchSearch("?ex=%20sema%20&pos=%2020").selected, 19);
  });

  it("keeps only valid letters and a bounded length, never markup", () => {
    const attack = parseBenchSearch(
      "?seq=" + encodeURIComponent("<img src=x onerror=alert(1)>"),
    );
    assert.match(attack.raw, LETTERS);
    assert.equal(attack.raw.includes("<"), false);
    assert.equal(attack.raw.includes(">"), false);
    assert.equal(attack.raw, "IMGSRCXNERRRALERT");

    const script = parseBenchSearch(
      "?seq=" + encodeURIComponent("<script>alert(1)</script>"),
    );
    assert.equal(script.raw, "SCRIPTALERTSCRIPT");
    assert.match(script.raw, LETTERS);

    const messy = parseBenchSearch("?seq=y-ggfl!!");
    assert.equal(messy.exampleId, "enk");
    assert.equal(messy.raw, "YGGFL");

    const capped = parseBenchSearch(`?seq=${"A".repeat(450)}&pos=400`);
    assert.equal(capped.raw, "A".repeat(400));
    assert.match(capped.raw, LETTERS);
    assert.equal(capped.selected, 399);
    assert.equal(
      parseBenchSearch(`?seq=${"A".repeat(450)}&pos=401`).selected,
      0,
    );
  });

  it("applies a valid pH when the sequence param is absent", () => {
    const state = parseBenchSearch("?ph=3");
    assert.equal(state.raw, "YGGFL");
    assert.equal(state.exampleId, "enk");
    assert.equal(state.pH, 3);
    assert.equal(state.selected, 0);
  });
});

describe("serializeBenchSearch", () => {
  it("omits the query for the default bench", () => {
    assert.equal(serializeBenchSearch(DEFAULT_BENCH_STATE), "");
    assert.equal(
      serializeBenchSearch({ ...DEFAULT_BENCH_STATE, pH: 99, windowSize: 9 }),
      "",
    );
  });

  it("prefers the example id and writes a 1-based position", () => {
    const search = serializeBenchSearch({
      raw: "yggfl",
      selected: 2,
      pH: 7.4,
      windowSize: 1,
      exampleId: "",
    });
    assert.equal(search, "ex=enk&pos=3&ph=7.4&w=1");
  });

  it("serializes a custom chain and a non-default Semaglutide view", () => {
    assert.equal(
      serializeBenchSearch({
        raw: sema.seq,
        selected: 19,
        pH: 7.4,
        windowSize: 7,
        exampleId: "sema",
      }),
      "ex=sema&pos=20&ph=7.4&w=7",
    );
    assert.equal(
      serializeBenchSearch({
        raw: "AAA",
        selected: 1,
        pH: 2,
        windowSize: 1,
        exampleId: "",
      }),
      "seq=AAA&pos=2&ph=2.0&w=1",
    );
  });

  it("turns three-letter names into a one-letter example link", () => {
    assert.equal(
      serializeBenchSearch({
        raw: "Tyr-Gly-Gly-Phe-Leu",
        selected: 4,
        pH: 8,
        windowSize: 1,
        exampleId: "",
      }),
      "ex=enk&pos=5&ph=8.0&w=1",
    );
  });

  it("does not put an unreadable sequence or markup into the query", () => {
    assert.equal(
      serializeBenchSearch({ ...DEFAULT_BENCH_STATE, raw: "B" }),
      null,
    );
    const search = serializeBenchSearch({
      ...DEFAULT_BENCH_STATE,
      raw: "<script>alert(1)</script>",
      exampleId: "",
    });
    assert.equal(search, "seq=SCRIPTALERTSCRIPT&pos=1&ph=7.4&w=1");
    assert.equal(search?.includes("<"), false);
    assert.equal(search?.includes(">"), false);
  });

  it("clamps an out-of-range selection to the chain that is on screen", () => {
    assert.equal(
      serializeBenchSearch({ ...DEFAULT_BENCH_STATE, selected: 40 }),
      "ex=enk&pos=5&ph=7.4&w=1",
    );
  });

  it("builds a path-free history and share URL", () => {
    const state: BenchUrlState = {
      raw: sema.seq,
      selected: 19,
      pH: 7.4,
      windowSize: 7,
      exampleId: "sema",
    };
    assert.equal(
      benchHistoryUrl("/", "", state),
      "/?ex=sema&pos=20&ph=7.4&w=7",
    );
    assert.equal(benchHistoryUrl("/", "#kept", DEFAULT_BENCH_STATE), "/#kept");
    assert.equal(
      benchShareHref("https://aminoviz.example", "/", state),
      "https://aminoviz.example/?ex=sema&pos=20&ph=7.4&w=7",
    );
    assert.equal(
      benchShareHref("https://aminoviz.example", "/", DEFAULT_BENCH_STATE),
      "https://aminoviz.example/",
    );
  });
});

describe("round trip", () => {
  const states: BenchUrlState[] = [
    DEFAULT_BENCH_STATE,
    {
      raw: sema.seq,
      selected: 19,
      pH: 7.4,
      windowSize: 7,
      exampleId: "sema",
    },
    {
      raw: "YGGFL",
      selected: 2,
      pH: 7.4,
      windowSize: 1,
      exampleId: "enk",
    },
    {
      raw: "AAAAAAAAA",
      selected: 8,
      pH: 2.5,
      windowSize: 9,
      exampleId: "",
    },
    {
      raw: EXAMPLES.find((example) => example.id === "ins")!.seq,
      selected: 0,
      pH: 8.2,
      windowSize: 5,
      exampleId: "ins",
    },
  ];

  for (const state of states) {
    it(`preserves ${state.exampleId || state.raw.slice(0, 8)} at position ${state.selected + 1}`, () => {
      const search = serializeBenchSearch(state);
      assert.equal(serializeBenchSearch(roundTrip(state)), search);
      assert.deepEqual(roundTrip(state), state);
    });
  }

  it("canonicalizes partial links", () => {
    const fromExample = parseBenchSearch("?ex=sema&pos=20&ph=7.4");
    assert.equal(
      serializeBenchSearch(fromExample),
      "ex=sema&pos=20&ph=7.4&w=7",
    );
    assert.deepEqual(roundTrip(fromExample), fromExample);

    const fromSeq = parseBenchSearch("?seq=YGGFL&pos=3");
    assert.equal(serializeBenchSearch(fromSeq), "ex=enk&pos=3&ph=7.4&w=1");
    assert.deepEqual(roundTrip(fromSeq), fromSeq);
  });
});

describe("every example link", () => {
  const exampleIds = [
    "enk",
    "sp",
    "oxy",
    "ins",
    "sema",
    "tirz",
    "reta",
    "lira",
    "exe",
    "teri",
    "biv",
  ];

  it("round-trips ?ex= for all 11 examples and keeps the export name", () => {
    assert.deepEqual(
      EXAMPLES.map((example) => example.id),
      exampleIds,
    );
    for (const example of EXAMPLES) {
      const opened = parseBenchSearch(`?ex=${example.id}`);
      assert.equal(opened.exampleId, example.id);
      assert.equal(opened.raw, example.seq);
      assert.equal(opened.selected, example.focus);
      assert.equal(opened.windowSize, example.window);
      assert.equal(opened.pH, 7.4);

      const search = serializeBenchSearch(opened);
      assert.notEqual(search, null);
      assert.deepEqual(parseBenchSearch(search ?? ""), opened);
      if (search)
        assert.match(search, new RegExp(`(^|&)ex=${example.id}(&|$)`));

      const shared = parseBenchSearch(`?ex=${example.id}&pos=1&ph=6`);
      assert.equal(shared.exampleId, example.id);
      assert.equal(shared.selected, 0);
      assert.equal(shared.pH, 6);
      const restored = parseBenchSearch(serializeBenchSearch(shared) ?? "");
      assert.equal(restored.exampleId, example.id);

      const letters = [...restored.raw];
      const exampleName =
        EXAMPLES.find((item) => item.id === restored.exampleId)?.name ?? null;
      const basename = exportBasename(exampleName, letters);
      assert.equal(basename, exportBasename(example.name, [...example.seq]));
      assert.notEqual(basename, exportBasename(null, letters));
      assert.equal(
        `${basename}.csv`,
        `${exportBasename(example.name, [...example.seq])}.csv`,
      );
      assert.equal(
        `${basename}.png`,
        `${exportBasename(example.name, [...example.seq])}.png`,
      );
    }
  });
});
