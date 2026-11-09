import { useMemo, useRef, useState } from "react";
import { EXAMPLES } from "@/lib/amino/examples";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  compareExampleChoices,
  compareSequences,
  DEFAULT_COMPARE_IDS,
  modificationTags,
  sequencesForExampleIds,
  type AlignedCell,
  type AlignedPosition,
  type ChainStats,
  type ComparedChain,
  type PositionModification,
} from "@/lib/amino/compare";
import type { SideClass } from "@/lib/amino/residues";
import { standInBadgeText } from "@/lib/amino/stand-ins";

const CLASS_CHIP: Record<SideClass, string> = {
  hydrophobic: "bg-hydrophobic text-ink",
  polar: "bg-polar text-ink",
  acidic: "bg-acidic text-ink",
  basic: "bg-basic text-ink",
  special: "bg-special text-ink",
};

type Slot = {
  key: string;
  exampleId: string;
  raw: string;
};

const INITIAL_SLOTS: Slot[] = DEFAULT_COMPARE_IDS.map((id, index) => ({
  key: `slot-${index + 1}`,
  exampleId: id,
  raw: sequencesForExampleIds([id])[0] ?? "",
}));

function formatSigned(value: number, digits = 2) {
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : text;
}

function matchingExampleId(raw: string): string {
  const trimmed = raw.trim();
  return EXAMPLES.find((example) => example.seq === trimmed)?.id ?? "";
}

function chainName(slot: Slot, index: number): string {
  const example = EXAMPLES.find((item) => item.id === slot.exampleId);
  if (example) return example.name;
  return `Chain ${index + 1}`;
}

function cellLabel(name: string, position: number, cell: AlignedCell, differs: boolean): string {
  const residue = cell.letter ? `${cell.letter} ${cell.name ?? ""}`.trim() : "gap";
  const state = differs ? "residues differ" : "same residue";
  const mark = cell.modification?.standIn
    ? `, ${cell.modification.standIn.accessibleLabel}`
    : cell.modification
      ? ", modification or note"
      : "";
  return `${name}, position ${position}, ${residue}, ${state}${mark}`;
}

export function Compare() {
  const [slots, setSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [pH, setPh] = useState(7.4);
  const nextKey = useRef(INITIAL_SLOTS.length + 1);

  const result = useMemo(
    () => compareSequences(
      slots.map((slot) => slot.raw),
      pH,
    ),
    [slots, pH],
  );
  const names = slots.map((slot, index) => chainName(slot, index));
  const keys = slots.map((slot) => slot.key);
  const diffCount = result.positions.filter((column) => column.differs).length;
  const markCount = result.positions.filter((column) => column.highlighted).length;

  function updateExample(key: string, exampleId: string) {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.key !== key) return slot;
        if (!exampleId) return { ...slot, exampleId: "" };
        const example = EXAMPLES.find((item) => item.id === exampleId);
        if (!example) return slot;
        return { ...slot, exampleId, raw: example.seq };
      }),
    );
  }

  function updateRaw(key: string, raw: string) {
    setSlots((current) =>
      current.map((slot) =>
        slot.key === key ? { ...slot, raw, exampleId: matchingExampleId(raw) } : slot,
      ),
    );
  }

  function addSlot() {
    setSlots((current) => {
      if (current.length >= COMPARE_MAX) return current;
      const key = `slot-${nextKey.current}`;
      nextKey.current += 1;
      return [...current, { key, exampleId: "", raw: "" }];
    });
  }

  function removeSlot(key: string) {
    setSlots((current) =>
      current.length <= COMPARE_MIN ? current : current.filter((slot) => slot.key !== key),
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-6" aria-labelledby="compare-heading">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-copper uppercase">Aligned by position</p>
        <h2 id="compare-heading" className="text-2xl">
          Side by side
        </h2>
        <p className="max-w-xl text-muted">
          Column 1 is the N-terminal residue of every chain, column 2 the next residue, and so on.
          A shorter chain leaves a gap. This is not a scored alignment.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface px-4 py-3">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <label htmlFor="compare-ph" className="text-sm text-muted">
            pH for the net charge
          </label>
          <span className="font-mono text-2xl text-copper tabular-nums">{pH.toFixed(1)}</span>
        </div>
        <input
          id="compare-ph"
          type="range"
          min={0}
          max={14}
          step={0.1}
          value={pH}
          onChange={(event) => setPh(Number(event.target.value))}
          aria-valuemin={0}
          aria-valuemax={14}
          aria-valuenow={pH}
          aria-valuetext={`pH ${pH.toFixed(1)}`}
        />
      </div>

      <SummaryTable names={names} rowKeys={keys} chains={result.chains} pH={pH} />

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl">The chains</h3>
          <p className="text-sm text-muted">
            {diffCount} {diffCount === 1 ? "position differs" : "positions differ"}. {markCount}{" "}
            {markCount === 1 ? "position carries" : "positions carry"} a modification or note.
            Scroll sideways to read the chains.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-4">
            <li className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-sm bg-copper/35 shadow-[inset_0_-2px_0_var(--color-copper)]" />
              Residues differ
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-sm bg-special ring-2 ring-copper ring-offset-1 ring-offset-bg" />
              Stand-in, same badge as the bench
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-sm bg-basic outline outline-1 outline-dashed outline-offset-2 outline-copper" />
              Other modification or note
            </li>
          </ul>
        </div>
        <Alignment names={names} rowKeys={keys} positions={result.positions} />
      </div>

      <NoteList names={names} rowKeys={keys} positions={result.positions} />
      <DifferenceList names={names} rowKeys={keys} positions={result.positions} />
      <SequenceEditor
        slots={slots}
        chains={result.chains}
        onExample={updateExample}
        onRaw={updateRaw}
        onAdd={addSlot}
        onRemove={removeSlot}
      />
    </section>
  );
}

function SummaryTable({
  names,
  rowKeys,
  chains,
  pH,
}: {
  names: string[];
  rowKeys: string[];
  chains: ComparedChain[];
  pH: number;
}) {
  const rows: { label: string; value: (stats: ChainStats) => string }[] = [
    { label: "Length", value: (stats) => String(stats.length) },
    { label: "Mass", value: (stats) => `${stats.mass.toFixed(2)} Da` },
    {
      label: `Net charge at pH ${pH.toFixed(1)}`,
      value: (stats) => formatSigned(stats.charge),
    },
    { label: "pI", value: (stats) => stats.pI.toFixed(2) },
    { label: "GRAVY", value: (stats) => formatSigned(stats.gravy) },
  ];
  return (
    <>
      <ul
        className="grid gap-3 sm:hidden"
        aria-label="Length, mass, net charge at the current pH, isoelectric point, and GRAVY"
      >
        {chains.map((chain, index) => (
          <li key={rowKeys[index]} className="rounded-card border border-line bg-surface px-4 py-3">
            <p className="text-base text-fg">{names[index]}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              {rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-muted">{row.label}</dt>
                  <dd className="font-mono text-sm text-fg tabular-nums">
                    {chain.stats ? row.value(chain.stats) : "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden min-w-0 max-w-full overflow-x-auto rounded-card border border-line bg-surface sm:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Length, mass, net charge at the current pH, isoelectric point, and GRAVY
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-surface px-3 py-3 text-left font-normal text-muted"
            >
              <span className="sr-only">Metric</span>
            </th>
            {names.map((name, index) => (
              <th key={rowKeys[index]} scope="col" className="px-3 py-3 text-left font-medium text-fg">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line last:border-b-0">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface px-3 py-3 text-left font-normal text-muted"
              >
                {row.label}
              </th>
              {chains.map((chain, index) => (
                <td key={rowKeys[index]} className="px-3 py-3 font-mono text-fg tabular-nums">
                  {chain.stats ? row.value(chain.stats) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function Alignment({
  names,
  rowKeys,
  positions,
}: {
  names: string[];
  rowKeys: string[];
  positions: AlignedPosition[];
}) {
  if (positions.length === 0) {
    return <p className="text-muted">Add two sequences to see them aligned by position.</p>;
  }
  return (
    <div
      className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-card border border-line bg-surface"
      tabIndex={0}
      aria-label="Peptide chains aligned by position"
    >
      <table className="w-max border-separate border-spacing-0">
        <caption className="sr-only">Aligned by position, N-terminus on the left</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 w-32 min-w-32 bg-surface px-2 py-2 text-left text-xs font-normal text-muted sm:w-40 sm:min-w-40"
            >
              Position
            </th>
            {positions.map((column) => (
              <th
                key={column.position}
                scope="col"
                className={
                  "w-12 min-w-12 px-0 py-2 text-center font-mono text-[11px] font-normal tabular-nums " +
                  (column.differs
                    ? "bg-copper/35 text-copper shadow-[inset_0_-2px_0_var(--color-copper)]"
                    : "text-muted")
                }
              >
                {column.position}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map((name, chainIndex) => (
            <tr key={rowKeys[chainIndex]}>
              <th
                scope="row"
                className="sticky left-0 z-20 w-32 min-w-32 border-r border-line bg-surface px-2 py-1 text-left text-xs font-medium text-fg sm:w-40 sm:min-w-40"
              >
                {name}
              </th>
              {positions.map((column) => {
                const cell = column.cells[chainIndex]!;
                return (
                  <td
                    key={column.position}
                    className={
                      "w-12 min-w-12 px-1 pt-1 pb-2 text-center " +
                      (column.differs ? "bg-copper/35" : "")
                    }
                  >
                    <span
                      className={tileClass(cell)}
                      aria-label={cellLabel(name, column.position, cell, column.differs)}
                      data-position={column.position}
                      data-differs={column.differs ? "true" : "false"}
                      data-kinds={cell.modification?.kinds.join(" ") ?? ""}
                      data-stand-in={cell.modification?.standIn?.accessibleLabel ?? ""}
                    >
                      {cell.letter ?? "–"}
                      {cell.modification?.standIn ? (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-bg px-1 font-sans text-[9px] leading-3 text-copper ring-1 ring-copper">
                          {standInBadgeText(cell.modification.standIn.label)}
                        </span>
                      ) : null}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tileClass(cell: AlignedCell): string {
  const tone = cell.klass ? CLASS_CHIP[cell.klass] : "bg-surface-2 text-muted";
  const standIn = cell.modification?.standIn
    ? " ring-2 ring-copper ring-offset-1 ring-offset-surface"
    : "";
  const other =
    cell.modification && !cell.modification.standIn
      ? " outline outline-1 outline-dashed outline-offset-2 outline-copper"
      : "";
  return `relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg font-mono text-sm ${tone}${standIn}${other}`;
}

function NoteList({
  names,
  rowKeys,
  positions,
}: {
  names: string[];
  rowKeys: string[];
  positions: AlignedPosition[];
}) {
  const marked = positions.filter((column) => column.highlighted);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-2xl">Modifications and notes</h3>
      <p className="text-sm text-muted">
        Aib sites, the acylated lysine, C-terminal amides, and stand-ins come from the same
        modified-peptide notes as the single-chain bench.
      </p>
      {marked.length === 0 ? (
        <p className="text-muted">These sequences have no stored modification or note.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {marked.map((column) => (
            <li key={column.position} className="rounded-xl border border-line bg-surface px-3 py-3">
              <p className="font-mono text-xs tracking-wide text-copper uppercase">
                Position {column.position}
                {column.differs ? " · residues differ" : ""}
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                {column.cells.map((cell, index) =>
                  cell.modification ? (
                    <li key={rowKeys[index]}>
                      <p className="text-sm text-fg">
                        {names[index]}
                        {cell.letter ? ` · ${cell.letter}` : ""}
                        {cell.name ? ` ${cell.name}` : ""}
                      </p>
                      <TagRow modification={cell.modification} />
                      {cell.modification.note ? (
                        <p className="mt-1 text-sm text-muted">{cell.modification.note.text}</p>
                      ) : null}
                      {cell.modification.note?.sideChain ? (
                        <p className="mt-1 font-mono text-xs text-copper">
                          {cell.modification.note.sideChain}
                        </p>
                      ) : null}
                    </li>
                  ) : null,
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TagRow({ modification }: { modification: PositionModification }) {
  const tags = modificationTags(modification);
  if (tags.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-copper px-2 py-0.5 text-xs text-copper"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function DifferenceList({
  names,
  rowKeys,
  positions,
}: {
  names: string[];
  rowKeys: string[];
  positions: AlignedPosition[];
}) {
  const differing = positions.filter((column) => column.differs);
  if (differing.length === 0) return null;
  return (
    <details className="rounded-card border border-line bg-surface px-4 py-3">
      <summary className="min-h-11 cursor-pointer text-sm text-fg">
        Positions that differ, listed by index
      </summary>
      <ul className="mt-3 flex flex-col gap-1 font-mono text-xs text-muted">
        {differing.map((column) => (
          <li key={column.position}>
            {column.position}:{" "}
            {column.cells
              .map((cell, index) => `${names[index] ?? rowKeys[index]} ${cell.letter ?? "–"}`)
              .join(" · ")}
          </li>
        ))}
      </ul>
    </details>
  );
}

function SequenceEditor({
  slots,
  chains,
  onExample,
  onRaw,
  onAdd,
  onRemove,
}: {
  slots: Slot[];
  chains: ComparedChain[];
  onExample: (key: string, exampleId: string) => void;
  onRaw: (key: string, raw: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl">Sequences</h3>
          <p className="mt-1 text-sm text-muted">
            Pick an example or paste one-letter codes. Two or three chains.
          </p>
        </div>
        {slots.length < COMPARE_MAX ? (
          <button
            type="button"
            onClick={onAdd}
            className="min-h-11 rounded-full border border-line px-4 text-sm text-fg hover:border-copper"
          >
            Add peptide
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {slots.map((slot, index) => {
          const chain = chains[index];
          const selectId = `compare-example-${slot.key}`;
          const sequenceId = `compare-sequence-${slot.key}`;
          return (
            <div
              key={slot.key}
              className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
            >
              <label className="flex flex-col gap-2 text-sm text-muted" htmlFor={selectId}>
                Example
                <select
                  id={selectId}
                  value={slot.exampleId}
                  onChange={(event) => onExample(slot.key, event.target.value)}
                  className="min-h-11 rounded-xl border border-line bg-bg px-3 text-base text-fg outline-none focus:border-copper"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="">Pasted sequence</option>
                  {compareExampleChoices().map((example) => (
                    <option key={example.id} value={example.id}>
                      {example.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted" htmlFor={sequenceId}>
                Sequence, N-terminus first
                <textarea
                  id={sequenceId}
                  value={slot.raw}
                  onChange={(event) => onRaw(slot.key, event.target.value)}
                  spellCheck={false}
                  rows={3}
                  placeholder="YGGFL"
                  wrap="soft"
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  className="min-h-20 w-full min-w-0 max-w-full resize-y rounded-xl border border-line bg-bg px-3 py-3 font-mono text-base text-fg outline-none focus:border-copper"
                />
              </label>
              {chain?.error ? (
                <p className="rounded-xl bg-acidic/15 px-3 py-2 text-sm text-fg" role="alert">
                  {chain.error}
                </p>
              ) : null}
              {slots.length > COMPARE_MIN ? (
                <button
                  type="button"
                  onClick={() => onRemove(slot.key)}
                  className="min-h-11 self-start rounded-full border border-line px-4 text-sm text-fg hover:border-copper"
                >
                  Remove
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
