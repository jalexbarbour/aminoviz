import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BY_CLASS, CLASS_LABEL, CLASS_ORDER, parseSequence, type SideClass } from "@/lib/amino/residues";
import { EXAMPLES } from "@/lib/amino/examples";
import {
  CALL_LABEL,
  analyze,
  chargeCurve,
  type Analysis,
  type StructureCall,
} from "@/lib/amino/chemistry";
import { modifiedPeptide, residueNote } from "@/lib/amino/modified";
import { ExportMenu } from "@/components/aminoviz/export-menu";
import { SourcesAndStandins } from "@/components/aminoviz/sources-and-standins";
import { Compare } from "@/components/aminoviz/compare";
import { HowToRead } from "@/components/aminoviz/how-to-read";
import { useBenchUrlState } from "@/lib/url-state";

const CLASS_CHIP: Record<SideClass, string> = {
  hydrophobic: "bg-hydrophobic text-ink",
  polar: "bg-polar text-ink",
  acidic: "bg-acidic text-ink",
  basic: "bg-basic text-ink",
  special: "bg-special text-ink",
};

const CALL_CHIP: Record<StructureCall, string> = {
  H: "bg-copper text-ink",
  E: "bg-basic text-ink",
  T: "bg-polar text-ink",
  C: "bg-surface-2 text-muted",
};

/** Null until after mount, so chart width never disagrees with the prerender. */
function useClientLayout() {
  const [layout, setLayout] = useState<null | { narrow: boolean }>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setLayout({ narrow: query.matches });
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return layout;
}

function formatSigned(value: number, digits = 2) {
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : text;
}

export function Bench() {
  const {
    raw,
    setRaw,
    selected,
    setSelected,
    pH,
    setPh,
    windowSize,
    setWindowSize,
    exampleId,
    setExampleId,
    copied,
    copyLink,
  } = useBenchUrlState();
  const [view, setView] = useState<"read" | "compare">("read");
  const layout = useClientLayout();

  const parsed = useMemo(() => parseSequence(raw), [raw]);
  const model = useMemo(
    () => (parsed.letters.length ? analyze(parsed.letters, pH, windowSize) : null),
    [parsed.letters, pH, windowSize],
  );
  const curve = useMemo(
    () => (model ? chargeCurve(model.residues, model.letters) : []),
    [model],
  );

  const safeIndex = model ? Math.min(selected, model.length - 1) : 0;
  const focus = model?.residues[safeIndex];

  function loadExample(id: string) {
    const example = EXAMPLES.find((item) => item.id === id);
    if (!example) return;
    setExampleId(id);
    setRaw(example.seq);
    setSelected(example.focus);
    setWindowSize(example.window);
  }

  function append(letter: string) {
    setExampleId("");
    setRaw((current) => {
      const body = current.trim();
      if (!body) return letter;
      return `${body}${letter}`;
    });
  }

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <PeptideMark />
          <p className="font-mono text-xs tracking-widest text-copper uppercase">Aminoviz</p>
          <button
            type="button"
            onClick={copyLink}
            aria-live="polite"
            className={
              "ml-auto min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors " +
              (copied ? "border-copper text-copper" : "border-line text-fg hover:border-copper")
            }
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <h1 className="text-4xl text-fg sm:text-5xl">Read a chain. Watch the chemistry.</h1>
        <p className="max-w-xl text-muted">
          Paste amino acids, or build a peptide one residue at a time. The numbers are textbook
          models — mass, charge, hydropathy, and a Chou–Fasman call — not a measured structure.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Bench view">
          <button
            type="button"
            aria-pressed={view === "read"}
            onClick={() => setView("read")}
            className={
              "min-h-11 rounded-full border px-4 py-2 text-sm transition-colors " +
              (view === "read"
                ? "border-copper bg-copper text-ink"
                : "border-line bg-surface-2 text-fg hover:border-copper")
            }
          >
            Read
          </button>
          <button
            type="button"
            aria-pressed={view === "compare"}
            onClick={() => setView("compare")}
            className={
              "min-h-11 rounded-full border px-4 py-2 text-sm transition-colors " +
              (view === "compare"
                ? "border-copper bg-copper text-ink"
                : "border-line bg-surface-2 text-fg hover:border-copper")
            }
          >
            Compare
          </button>
        </div>
      </header>

      {view === "compare" ? (
        <Compare />
      ) : (
      <div className="flex min-w-0 flex-col gap-6">
      <section className="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => {
            const active = exampleId === example.id;
            return (
              <button
                key={example.id}
                type="button"
                onClick={() => loadExample(example.id)}
                className={
                  "min-h-11 rounded-full border px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "border-copper bg-copper text-ink"
                    : "border-line bg-surface-2 text-fg hover:border-copper")
                }
                aria-pressed={active}
              >
                {example.name}
              </button>
            );
          })}
        </div>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-sm text-muted">Sequence, N-terminus first</span>
          <textarea
            value={raw}
            onChange={(event) => {
              setExampleId("");
              setRaw(event.target.value);
              setSelected(0);
            }}
            spellCheck={false}
            rows={3}
            placeholder="YGGFL or Tyr-Gly-Gly-Phe-Leu"
            wrap="soft"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            className="min-h-24 w-full min-w-0 max-w-full resize-y rounded-xl border border-line bg-bg px-3 py-3 font-mono text-base leading-6 text-fg outline-none focus:border-copper"
          />
        </label>
        {parsed.error ? (
          <p className="rounded-xl bg-acidic/15 px-3 py-2 text-sm text-fg" role="alert">
            {parsed.error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-4 text-sm text-fg hover:border-copper"
            onClick={() => {
              setExampleId("");
              setRaw((current) => current.slice(0, -1));
            }}
          >
            Delete last
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-4 text-sm text-fg hover:border-copper"
            onClick={() => {
              setExampleId("");
              setRaw("");
              setSelected(0);
            }}
          >
            Clear
          </button>
        </div>
        <ResiduePalette onAppend={append} />
      </section>

      <HowToRead />

      {model && focus ? (
        <>
          <p className="rounded-card border border-line bg-surface-2 px-4 py-4 text-base leading-relaxed text-fg">
            {model.outcome}
          </p>
          <StatGrid model={model} />
          <ExportMenu model={model} exampleId={exampleId} selected={safeIndex} />
          <ChainStrip model={model} selected={safeIndex} onSelect={setSelected} />
          <SourcesAndStandins letters={model.letters} part="badges" />
          <PeptideNotes letters={model.letters} selected={safeIndex} onSelect={setSelected} />
          <SourcesAndStandins letters={model.letters} part="sources" />
          <Inspector model={model} index={safeIndex} />
          <ChargeLab
            model={model}
            curve={curve}
            pH={pH}
            mounted={layout !== null}
            narrow={layout?.narrow ?? false}
            onPh={setPh}
          />
          <Hydrophobicity
            model={model}
            windowSize={windowSize}
            mounted={layout !== null}
            onWindow={setWindowSize}
          />
          <SourcesAndStandins
            letters={model.letters}
            hydropathy={model.hydrophobicity}
            part="charts"
          />
          <Composition model={model} />
          <MethodNotes />
        </>
      ) : (
        <p className="text-muted">
          Add a residue to see mass, charge, and how the side chains behave. One-letter codes can
          be run together. Three-letter codes need a separator, as in Gly-Leu, or a full name.
        </p>
      )}
      </div>
      )}
    </main>
  );
}

function PeptideNotes({
  letters,
  selected,
  onSelect,
}: {
  letters: string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const notes = modifiedPeptide(letters)?.notes;
  if (!notes?.[1]) return null;
  return (
    <ul className="flex flex-col gap-2">
      {Object.entries(notes).map(([key, note]) => {
        const index = Number(key);
        const active = index === selected;
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={
                "min-h-11 w-full rounded-xl border px-3 py-3 text-left text-sm text-fg " +
                (active ? "border-copper bg-surface" : "border-line bg-surface-2")
              }
            >
              {note.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PeptideMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="34" height="34" rx="10" fill="var(--color-surface-2)" />
      <circle cx="10" cy="18" r="3.2" fill="var(--color-polar)" />
      <circle cx="18" cy="18" r="3.2" fill="var(--color-copper)" />
      <circle cx="26" cy="18" r="3.2" fill="var(--color-basic)" />
      <path d="M13 18h2.2M21 18h2.2" stroke="var(--color-fg)" strokeWidth="1.4" />
    </svg>
  );
}

function ResiduePalette({ onAppend }: { onAppend: (letter: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Tap a residue to add it at the C-terminus.</p>
      {CLASS_ORDER.map((klass) => (
        <div key={klass} className="flex flex-col gap-2">
          <p className="text-xs tracking-wide text-muted uppercase">{CLASS_LABEL[klass]}</p>
          <div className="grid min-w-0 grid-cols-5 gap-2 sm:grid-cols-8">
            {BY_CLASS[klass].map((residue) => (
              <button
                key={residue.letter}
                type="button"
                onClick={() => onAppend(residue.letter)}
                className={
                  "flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl px-1 py-1.5 " +
                  CLASS_CHIP[klass]
                }
                aria-label={`Add ${residue.name}`}
              >
                <span className="font-mono text-base leading-none">{residue.letter}</span>
                <span className="text-xs leading-tight opacity-80">{residue.code3}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatGrid({ model }: { model: Analysis }) {
  const stats = [
    ["Residues", String(model.length)],
    ["Mass", `${model.mass.toFixed(1)} Da`],
    ["Charge", formatSigned(model.charge)],
    ["pI", model.pI.toFixed(2)],
    ["GRAVY", formatSigned(model.gravy)],
    ["Aliphatic", model.aliphatic.toFixed(1)],
    ["ε280", `${Math.round(model.extinction)}`],
    ["Peptide bonds", String(model.length - 1)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-card border border-line bg-surface px-3 py-3">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-1 font-mono text-lg text-fg tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChainStrip({
  model,
  selected,
  onSelect,
}: {
  model: Analysis;
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-2xl">The chain</h2>
        <p className="font-mono text-xs text-muted">N → C</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {model.residues.map((residue, index) => {
          const active = index === selected;
          const noted = residueNote(model.letters, index);
          return (
            <button
              key={`${residue.letter}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              aria-pressed={active}
              aria-label={`${index + 1} ${residue.name}, ${CALL_LABEL[model.calls[index]!]}`}
              className={
                "flex h-12 w-12 items-center justify-center rounded-xl font-mono text-base " +
                CLASS_CHIP[residue.klass] +
                (noted && !active ? " ring-1 ring-copper" : "") +
                (active ? " ring-2 ring-fg ring-offset-2 ring-offset-bg" : "")
              }
            >
              {residue.letter}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {model.calls.map((call, index) => (
          <span
            key={`call-${index}`}
            className={
              "flex h-7 w-12 items-center justify-center rounded-md font-mono text-xs " +
              CALL_CHIP[call]
            }
          >
            {call}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted">
        Color is the side-chain class. The letter under each residue is the Chou–Fasman call: H
        helix, E sheet, T turn, C coil.
      </p>
    </section>
  );
}

function Inspector({ model, index }: { model: Analysis; index: number }) {
  const residue = model.residues[index]!;
  const call = model.calls[index]!;
  const note = residueNote(model.letters, index);
  const here = model.groups.filter(
    (item) =>
      item.id === `${residue.letter}-${index}` || item.id.startsWith(`${residue.letter}-${index}-`),
  );
  const chargeHere = here.reduce((sum, item) => sum + item.charge, 0);
  return (
    <section className="grid min-w-0 gap-4 rounded-card border border-line bg-surface p-4 sm:grid-cols-[auto_1fr] sm:p-5">
      <div
        className={
          "flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-2xl sm:h-20 sm:w-20 sm:text-3xl " +
          CLASS_CHIP[residue.klass]
        }
        aria-hidden="true"
      >
        {residue.letter}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-muted">
          Residue {index + 1} of {model.length}
        </p>
        <h2 className="text-2xl sm:text-3xl">
          {residue.name}{" "}
          <span className="mt-0.5 block font-mono text-base text-muted sm:mt-0 sm:inline sm:text-lg">
            {residue.code3} · {residue.letter}
          </span>
        </h2>
        <p className="font-mono text-sm break-words text-copper">
          {note?.sideChain ?? residue.sideChain}
        </p>
        {note ? (
          <p className="rounded-xl border border-copper bg-surface-2 px-3 py-2 text-sm text-fg">
            {note.text}
          </p>
        ) : null}
        {note?.sideChain ? null : <p className="text-fg">{residue.note}</p>}
        <dl className="mt-1 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-3 sm:gap-x-4">
          <Fact label="Class" value={CLASS_LABEL[residue.klass]} />
          <Fact label="Call" value={CALL_LABEL[call]} />
          <Fact label="Hydropathy" value={formatSigned(residue.kd, 1)} />
          <Fact label="Pα helix" value={residue.helix.toFixed(2)} />
          <Fact label="Pβ sheet" value={residue.sheet.toFixed(2)} />
          <Fact label="Pturn" value={residue.turn.toFixed(2)} />
          <Fact
            label="Side-chain pKa"
            value={residue.pKa == null ? "none" : residue.pKa.toFixed(2)}
          />
          <Fact
            label="Charge here"
            value={here.length ? formatSigned(chargeHere) : "0, not ionizable"}
          />
          <Fact label="Residue mass" value={`${residue.mass.toFixed(2)} Da`} />
        </dl>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono break-words text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function ChargeLab({
  model,
  curve,
  pH,
  mounted,
  narrow,
  onPh,
}: {
  model: Analysis;
  curve: { pH: number; charge: number }[];
  pH: number;
  mounted: boolean;
  narrow: boolean;
  onPh: (value: number) => void;
}) {
  const ticks = narrow ? [0, 4, 7.4, 10, 14] : [0, 2, 4, 6, 7.4, 10, 12, 14];
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="text-2xl">Charge against pH</h2>
        <p className="mt-1 text-sm text-muted">
          Each ionizable group follows the Henderson–Hasselbalch equation. Acids go from 0 to −1
          as pH rises past their pKa. Bases go from +1 to 0.
        </p>
      </div>
      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor="ph" className="text-sm text-muted">
            pH
          </label>
          <span className="font-mono text-2xl text-copper tabular-nums">{pH.toFixed(1)}</span>
        </div>
        <input
          id="ph"
          type="range"
          min={0}
          max={14}
          step={0.1}
          value={pH}
          onChange={(event) => onPh(Number(event.target.value))}
          aria-valuemin={0}
          aria-valuemax={14}
          aria-valuenow={pH}
          aria-valuetext={`pH ${pH.toFixed(1)}`}
        />
        <div className="h-56 w-full min-w-0 max-w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis
                  dataKey="pH"
                  stroke="var(--color-muted)"
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  tickMargin={6}
                  ticks={ticks}
                  interval={0}
                />
                <YAxis
                  stroke="var(--color-muted)"
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(2), "Charge"]}
                  labelFormatter={(label) => `pH ${Number(label).toFixed(1)}`}
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-line)",
                    borderRadius: "0.75rem",
                    color: "var(--color-fg)",
                  }}
                />
                <ReferenceLine x={pH} stroke="var(--color-copper)" strokeDasharray="4 4" />
                <ReferenceLine y={0} stroke="var(--color-muted)" />
                <Line
                  type="monotone"
                  dataKey="charge"
                  stroke="var(--color-copper)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-xl bg-surface-2" />
          )}
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {model.groups.map((group) => (
          <li
            key={group.id}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3"
          >
            <div>
              <p className="text-sm text-fg">{group.label}</p>
              <p className="font-mono text-xs text-muted">
                pKa {group.pKa.toFixed(2)} · {Math.round(group.protonated * 100)}% protonated
              </p>
            </div>
            <p className="font-mono text-lg text-fg tabular-nums">{formatSigned(group.charge)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Hydrophobicity({
  model,
  windowSize,
  mounted,
  onWindow,
}: {
  model: Analysis;
  windowSize: number;
  mounted: boolean;
  onWindow: (size: number) => void;
}) {
  const data = model.hydrophobicity.map((point) => ({
    position: point.index + 1,
    score: point.score,
    letter: model.letters[point.index],
  }));
  const choices = [1, 3, 5, 7, 9].filter((size) => size <= model.length || size === 1);
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-2xl">Hydropathy</h2>
      <p className="text-sm text-muted">
        Kyte–Doolittle scores. Above zero is hydrophobic. A window averages neighboring residues,
        which is how transmembrane helices are usually spotted — a run of about 20 above +1.6.
        Short peptides rarely have one.
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onWindow(size)}
            aria-pressed={windowSize === size}
            className={
              "min-h-11 rounded-full border px-3 text-sm " +
              (windowSize === size
                ? "border-copper bg-copper text-ink"
                : "border-line text-fg hover:border-copper")
            }
          >
            Window {size}
          </button>
        ))}
      </div>
      <div className="h-56 min-w-0 max-w-full rounded-card border border-line bg-surface p-3">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis
                dataKey="position"
                stroke="var(--color-muted)"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                tickMargin={6}
                minTickGap={32}
              />
              <YAxis
                stroke="var(--color-muted)"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                width={48}
              />
              <Tooltip
                formatter={(value) => [Number(value).toFixed(2), "Score"]}
                labelFormatter={(label, payload) => {
                  const letter = payload?.[0]?.payload?.letter ?? "";
                  return `${letter}${label}`;
                }}
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "0.75rem",
                  color: "var(--color-fg)",
                }}
              />
              <ReferenceLine y={0} stroke="var(--color-muted)" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-polar)"
                strokeWidth={2}
                dot={{ r: model.length > 20 ? 0 : 3, fill: "var(--color-polar)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-xl bg-surface-2" />
        )}
      </div>
    </section>
  );
}

function Composition({ model }: { model: Analysis }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl">Composition</h2>
      <ul className="flex flex-col gap-2">
        {model.composition.map((row) => (
          <li
            key={row.klass}
            className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[7.5rem_1fr_auto] sm:gap-3"
          >
            <span className="min-w-0 text-sm text-fg">{row.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-2">
              <span
                className={"block h-full rounded-full " + CLASS_CHIP[row.klass].split(" ")[0]}
                style={{ width: `${Math.max(8, row.fraction * 100)}%` }}
              />
            </span>
            <span className="font-mono text-sm text-muted tabular-nums">
              {row.count} · {Math.round(row.fraction * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MethodNotes() {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted">
      <h2 className="text-2xl text-fg">What is actually being modeled</h2>
      <p>
        Peptide mass is the sum of average residue masses plus one water (18.015 Da) for the two
        termini. Every new peptide bond is a condensation: the backbone loses H from the amino
        group and OH from the carboxyl, and those leave as water.
      </p>
      <p>
        Charge uses fixed textbook pKa values: N-terminus 9.69, C-terminus 2.34, Asp 3.9, Glu 4.3,
        His 6.04, Cys 8.33, Tyr 10.07, Lys 10.54, Arg 12.48. Real peptides shift these depending
        on neighbors. The pI is the pH where the summed charge crosses zero.
      </p>
      <p>
        GRAVY is the mean Kyte–Doolittle score. The aliphatic index follows Ikai: mole percent of
        Ala + 2.9 Val + 3.9 (Ile + Leu). Absorbance at 280 nm counts Trp at 5500 and Tyr at 1490
        M⁻¹ cm⁻¹, assuming reduced cysteines. Each disulfide would add about 125.
      </p>
      <p>
        Secondary structure is Chou and Fasman, 1978. Helix needs four of six residues with Pα
        above 1, then extension, and the segment must beat the sheet score. Turns use the
        positional-frequency product. It was designed for whole proteins and is often wrong on
        short peptides. It will not tell you a three-dimensional fold.
      </p>
    </section>
  );
}
