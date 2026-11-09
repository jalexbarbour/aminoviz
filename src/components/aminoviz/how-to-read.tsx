/**
 * Closed `<details>` on the server and on the first client render.
 * There is no state to disagree about, so hydration stays in sync.
 */
export function HowToRead() {
  return (
    <details className="how-to rounded-card border border-line bg-surface" suppressHydrationWarning>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper sm:px-5">
        <h2 className="text-2xl">How to read this</h2>
        <span className="how-to-show font-mono text-xs tracking-wide text-copper uppercase">Show</span>
        <span className="how-to-hide font-mono text-xs tracking-wide text-copper uppercase">
          Hide
        </span>
      </summary>
      <div className="flex min-w-0 flex-col gap-4 border-t border-line px-4 py-4 text-sm leading-relaxed text-fg sm:px-5">
        <section className="flex flex-col gap-1">
          <h3 className="text-lg">Net charge against pH</h3>
          <p>
            The curve adds every group in the model that can gain or lose a proton: the N-terminus,
            the C-terminus when it is a free acid, and the side chains treated as ionizable (Asp,
            Glu, His, Cys, Tyr, Lys, and Arg). Each one follows the Henderson–Hasselbalch equation
            with a fixed textbook pKa. As pH rises, an acid goes from uncharged toward −1, and a
            base goes from +1 toward uncharged. The dashed copper line is the pH on the slider.
            Charged neighbors in a real peptide move these pKa values, so read the curve as a
            model. On a few modified peptides the acylated lysine is left out of the base list, and
            the carboxyl groups named on its card are added instead.
          </p>
        </section>
        <section className="flex flex-col gap-1">
          <h3 className="text-lg">Isoelectric point</h3>
          <p>
            The pI is the pH where that net charge crosses zero. Below the pI this model is net
            positive. Above the pI it is net negative. The page searches from pH 0 to 14 for the
            crossing, which works because the charge in this model only falls as pH rises. The
            printed value is that result, to two decimal places.
          </p>
        </section>
        <section className="flex flex-col gap-1">
          <h3 className="text-lg">GRAVY</h3>
          <p>
            GRAVY is the grand average of hydropathy: add the Kyte–Doolittle score of each residue,
            then divide by the length. Positive means hydrophobic on balance. Negative means
            hydrophilic on balance. It describes the sequence. It is not a measured solubility. The
            scores are from{" "}
            <Cite
              href="https://doi.org/10.1016/0022-2836(82)90515-0"
              text="Kyte and Doolittle, Journal of Molecular Biology 157:105 (1982)"
            />
            .
          </p>
        </section>
        <section className="flex flex-col gap-1">
          <h3 className="text-lg">Chou–Fasman propensities</h3>
          <p>
            Pα, Pβ, and Pturn compare how often an amino acid sat in a helix, a sheet, or a turn
            with how often that amino acid appeared at all, in protein structures known in the
            1970s. Above 1 means more often than its share of that table. Below 1 means less often.
            The letter under each residue applies a cutoff rule to those ratios: H helix, E sheet,
            T turn, or C when none of those calls is made.{" "}
            <Cite
              href="https://doi.org/10.1021/bi00699a002"
              text="Chou and Fasman, Biochemistry 13:222 (1974)"
            />{" "}
            introduced the method. The ratios on this page are the later 1978 published set. It is
            an empirical tally from that era. It does not build a three-dimensional fold, it misses
            most contacts between distant parts of the chain, and it is often wrong on short
            peptides.
          </p>
        </section>
        <section className="flex flex-col gap-1">
          <h3 className="text-lg">The smoothing window</h3>
          <p>
            Window 1 plots each residue's own Kyte–Doolittle score. A larger window replaces that
            score with the average of the residue and its neighbors, centered on the residue: one
            neighbor on each side for window 3, two for window 5, and so on. At either end of the
            chain the window is cut short, so those points use fewer residues than the number you
            picked. Averaging makes a hydrophobic stretch easier to see and softens one unusual
            residue. Kyte and Doolittle flagged a stretch of at least 19 residues averaging above
            +1.6 as a candidate for spanning a membrane, not as proof of one. A short peptide will
            not show that pattern. GRAVY stays the mean of the unsmoothed scores, so the window
            buttons do not change it.
          </p>
        </section>
        <section className="flex flex-col gap-1">
          <h3 className="text-lg">What a stand-in value means</h3>
          <p>
            The hydropathy scale and the propensity tables cover the twenty coded amino acids. When
            a residue was not in those tables, this page borrows another residue's numbers and the
            card says which one. Aib, entered as X, uses alanine's hydropathy and Chou–Fasman
            values. α-Methyl-leucine, where a note says so, uses leucine's. A stand-in is that
            borrowed table value. The card names the residue it was copied from. Mass is counted
            separately, so the dalton total can include the real chemical difference while the
            chart still shows the borrowed scores.
          </p>
        </section>
      </div>
    </details>
  );
}

function Cite({ href, text }: { href: string; text: string }) {
  return (
    <a
      className="text-copper underline decoration-copper/60 underline-offset-2"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {text}
    </a>
  );
}
