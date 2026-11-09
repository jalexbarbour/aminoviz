import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from "react";
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
import { EXAMPLES } from "@/lib/amino/examples";
import { RESIDUES } from "@/lib/amino/residues";
import { sourcesForExample, type SourceLink } from "@/lib/amino/sources";
import {
  standInBadgeText,
  standInChartNote,
  standInHits,
  type StandInHit,
} from "@/lib/amino/stand-ins";

type Part = "badges" | "sources" | "charts";

type ChipBox = {
  index: number;
  top: number;
  left: number;
  text: string;
  accessibleLabel: string;
};

type ChartRing = {
  index: number;
  x: number;
  y: number;
  accessibleLabel: string;
};

const SERIES = [
  { key: "helix", name: "Pα helix", stroke: "var(--color-copper)" },
  { key: "sheet", name: "Pβ sheet", stroke: "var(--color-basic)" },
  { key: "turn", name: "Pturn", stroke: "var(--color-polar)" },
] as const;

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function sourcesForLetters(letters: readonly string[]): readonly SourceLink[] {
  const example = EXAMPLES.find((item) => item.seq === letters.join(""));
  if (!example) return [];
  return sourcesForExample(example.id);
}

function chainButtons(section: Element): HTMLButtonElement[] {
  return [...section.querySelectorAll("button")].filter(
    (button): button is HTMLButtonElement =>
      button.classList.contains("h-12") && button.classList.contains("w-12"),
  );
}

function labelWithStandIn(current: string, accessibleLabel: string | null): string {
  const base = current.replace(/, [a-z]+ stand-in$/i, "");
  return accessibleLabel ? `${base}, ${accessibleLabel}` : base;
}

function readTicks(svg: SVGSVGElement, axis: "x" | "y") {
  const group = svg.querySelector(`.recharts-${axis}Axis`);
  if (!group) return [];
  const ticks: { value: number; x: number; y: number }[] = [];
  for (const tick of group.querySelectorAll(".recharts-cartesian-axis-tick")) {
    const text = tick.querySelector("text");
    if (!text) continue;
    const value = Number(text.textContent);
    if (!Number.isFinite(value)) continue;
    const rect = text.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    ticks.push({
      value,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }
  return ticks;
}

function linear(ticks: { value: number; x: number; y: number }[], value: number, key: "x" | "y") {
  if (ticks.length < 2) return null;
  const sorted = [...ticks].sort((a, b) => a.value - b.value);
  const low = sorted[0]!;
  const high = sorted[sorted.length - 1]!;
  if (low.value === high.value) return null;
  const t = (value - low.value) / (high.value - low.value);
  return low[key] + t * (high[key] - low[key]);
}

function StandInDot(props: unknown): ReactElement<SVGElement> {
  const { cx, cy, stroke, payload, index, dataKey } = props as {
    cx?: number;
    cy?: number;
    stroke?: string;
    index?: number;
    dataKey?: string | number;
    payload?: { standIn?: string };
  };
  const key = `${dataKey ?? "series"}-${index ?? "i"}-${cx ?? "x"}-${cy ?? "y"}`;
  if (cx == null || cy == null || !payload?.standIn) return <g key={key} />;
  return (
    <circle
      key={key}
      cx={cx}
      cy={cy}
      r={5}
      fill="var(--color-surface)"
      stroke={stroke ?? "var(--color-copper)"}
      strokeWidth={2}
    />
  );
}

function SourcesLine({ sources }: { sources: readonly SourceLink[] }) {
  if (sources.length === 0) return null;
  return (
    <p className="text-sm text-muted">
      <span className="mr-2 text-fg">Sources</span>
      {sources.map((source, index) => (
        <span key={source.url}>
          {index > 0 ? <span className="mx-1.5">·</span> : null}
          <a
            href={source.url}
            target="_blank"
            rel="noopener"
            className="text-copper underline decoration-copper/40 underline-offset-2 hover:decoration-copper"
          >
            {source.label}
          </a>
        </span>
      ))}
    </p>
  );
}

export function SourcesAndStandins({
  letters,
  part,
  hydropathy = [],
}: {
  letters: readonly string[];
  part: Part;
  hydropathy?: readonly { index: number; score: number }[];
}) {
  const sequence = letters.join("");
  const scoreKey = hydropathy.map((point) => `${point.index}:${point.score}`).join(",");
  const hits = useMemo(() => standInHits(letters), [letters]);
  const sources = useMemo(() => sourcesForLetters(letters), [letters]);
  const mounted = useMounted();
  const badgeHost = useRef<HTMLSpanElement>(null);
  const chartHost = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<ChipBox[]>([]);
  const [rings, setRings] = useState<ChartRing[]>([]);

  useLayoutEffect(() => {
    if (part !== "badges") return;
    const host = badgeHost.current;
    const section = host?.previousElementSibling;
    if (!host || !section) return;

    const place = () => {
      const buttons = chainButtons(section);
      const next: ChipBox[] = [];
      buttons.forEach((button, index) => {
        const hit = hits.find((item) => item.index === index) ?? null;
        const labeled = labelWithStandIn(button.getAttribute("aria-label") ?? "", hit?.accessibleLabel ?? null);
        if (button.getAttribute("aria-label") !== labeled) button.setAttribute("aria-label", labeled);
        if (!hit) return;
        const rect = button.getBoundingClientRect();
        next.push({
          index,
          top: rect.top,
          left: rect.left + rect.width / 2,
          text: standInBadgeText(hit.label),
          accessibleLabel: hit.accessibleLabel,
        });
      });
      setBoxes((current) => (sameBoxes(current, next) ? current : next));
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(section);
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [part, sequence, hits]);

  useLayoutEffect(() => {
    if (part !== "charts" || hits.length === 0) return;
    const host = chartHost.current;
    const section = host?.previousElementSibling;
    if (!host || !section) return;

    const place = () => {
      const svg = section.querySelector("svg");
      if (!svg) {
        setRings((current) => (current.length === 0 ? current : []));
        return;
      }
      const xTicks = readTicks(svg, "x");
      const yTicks = readTicks(svg, "y");
      const next: ChartRing[] = [];
      for (const hit of hits) {
        const point = hydropathy.find((item) => item.index === hit.index);
        if (!point) continue;
        const x = linear(xTicks, hit.index + 1, "x");
        const y = linear(yTicks, point.score, "y");
        if (x == null || y == null) continue;
        next.push({ index: hit.index, x, y, accessibleLabel: hit.accessibleLabel });
      }
      setRings((current) => (sameRings(current, next) ? current : next));
    };

    place();
    const frame = requestAnimationFrame(place);
    const mutations = new MutationObserver(place);
    mutations.observe(section, { childList: true, subtree: true });
    const resize = new ResizeObserver(place);
    resize.observe(section);
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [part, sequence, scoreKey, hits, hydropathy]);

  if (part === "sources") return <SourcesLine sources={sources} />;

  if (part === "badges") {
    return (
      <>
        <span ref={badgeHost} className="hidden" />
        {boxes.map((box) => (
          <span
            key={box.index}
            data-stand-in-badge={box.accessibleLabel}
            className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-copper bg-ink px-1 py-px font-mono text-[10px] leading-none text-copper"
            style={{ top: box.top, left: box.left }}
          >
            <span aria-hidden="true">{box.text}</span>
            <span className="sr-only">{box.accessibleLabel}</span>
          </span>
        ))}
      </>
    );
  }

  if (hits.length === 0) return null;
  return (
    <div ref={chartHost} className="flex flex-col gap-3">
      <p className="text-sm text-muted">{standInChartNote(hits)}</p>
      <PropensityChart letters={letters} hits={hits} mounted={mounted} />
      {rings.map((ring) => (
        <span
          key={ring.index}
          data-stand-in-ring={ring.accessibleLabel}
          aria-hidden="true"
          className="pointer-events-none fixed z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-copper bg-surface"
          style={{ top: ring.y, left: ring.x }}
        />
      ))}
    </div>
  );
}

function PropensityChart({
  letters,
  hits,
  mounted,
}: {
  letters: readonly string[];
  hits: readonly StandInHit[];
  mounted: boolean;
}) {
  const marked = new Set(hits.map((hit) => hit.index));
  const data = letters.map((letter, index) => {
    const residue = RESIDUES[letter];
    return {
      position: index + 1,
      helix: residue?.helix ?? null,
      sheet: residue?.sheet ?? null,
      turn: residue?.turn ?? null,
      standIn: marked.has(index) ? (hits.find((hit) => hit.index === index)?.accessibleLabel ?? "") : "",
    };
  });
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-2xl">Propensities</h2>
        <p className="mt-1 text-sm text-muted">
          Chou–Fasman Pα, Pβ, and Pturn. A hollow ring is a stand-in value copied from another
          residue. The line at 1 is the neutral propensity.
        </p>
      </div>
      <div className="h-56 rounded-card border border-line bg-surface p-3">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis
                dataKey="position"
                stroke="var(--color-muted)"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              />
              <YAxis
                stroke="var(--color-muted)"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                width={36}
              />
              <Tooltip
                formatter={(value, name) => [Number(value).toFixed(2), name]}
                labelFormatter={(label, payload) => {
                  const standIn = payload?.[0]?.payload?.standIn;
                  return standIn ? `Position ${label}, ${standIn}` : `Position ${label}`;
                }}
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "0.75rem",
                  color: "var(--color-fg)",
                }}
              />
              <ReferenceLine y={1} stroke="var(--color-muted)" strokeDasharray="4 4" />
              {SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.name}
                  stroke={series.stroke}
                  strokeWidth={2}
                  dot={StandInDot}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-xl bg-surface-2" />
        )}
      </div>
    </section>
  );
}

function sameBoxes(current: ChipBox[], next: ChipBox[]) {
  if (current.length !== next.length) return false;
  return current.every((box, index) => {
    const other = next[index]!;
    return (
      box.index === other.index &&
      box.text === other.text &&
      Math.abs(box.top - other.top) < 0.5 &&
      Math.abs(box.left - other.left) < 0.5
    );
  });
}

function sameRings(current: ChartRing[], next: ChartRing[]) {
  if (current.length !== next.length) return false;
  return current.every((ring, index) => {
    const other = next[index]!;
    return (
      ring.index === other.index &&
      Math.abs(ring.x - other.x) < 0.5 &&
      Math.abs(ring.y - other.y) < 0.5
    );
  });
}
