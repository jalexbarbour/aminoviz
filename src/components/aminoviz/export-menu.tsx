import { useState } from "react";
import { EXAMPLES } from "@/lib/amino/examples";
import type { Analysis } from "@/lib/amino/chemistry";
import {
  analysisCsvBlob,
  downloadBlob,
  exportBasename,
  renderChainPng,
} from "@/lib/export";

export function ExportMenu({
  model,
  exampleId,
  selected,
}: {
  model: Analysis;
  exampleId: string;
  selected: number;
}) {
  const [pngError, setPngError] = useState<string | null>(null);
  const exampleName =
    EXAMPLES.find((item) => item.id === exampleId)?.name ?? null;
  const basename = exportBasename(exampleName, model.letters);
  const title =
    exampleName ??
    (model.letters.length <= 40
      ? model.letters.join("")
      : `${model.length}-residue peptide`);

  function onCsv() {
    downloadBlob(`${basename}.csv`, analysisCsvBlob(model));
  }

  async function onPng() {
    setPngError(null);
    try {
      const blob = await renderChainPng({ model, title, selected });
      downloadBlob(`${basename}.png`, blob);
    } catch {
      setPngError("The PNG could not be created in this browser.");
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Export">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Export</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-4 text-sm text-fg hover:border-copper"
            onClick={onCsv}
          >
            Download CSV
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-4 text-sm text-fg hover:border-copper"
            onClick={() => {
              void onPng();
            }}
          >
            Download PNG
          </button>
        </div>
      </div>
      {pngError ? (
        <p
          className="rounded-xl bg-acidic/15 px-3 py-2 text-sm text-fg"
          role="alert"
        >
          {pngError}
        </p>
      ) : null}
    </section>
  );
}
