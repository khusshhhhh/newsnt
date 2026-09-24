import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl sm:text-3xl",
} as const;

/** Letter-spacing per size, in font units (1/1000 em) — the tracking the wordmark was set with. */
const TRACKING: Record<keyof typeof SIZES, number> = { sm: 60, md: 60, lg: 80 };

/**
 * "FLOW" in Ofelia Display ExtraBold, as outlines (shaped with the font's
 * own kerning). This used to be live text in the Adobe Fonts kit, which
 * meant a render-blocking stylesheet — plus the kit's tracking stylesheet —
 * on every page just to draw four letters. Inline outlines render with the
 * first byte of HTML and never flash a fallback font.
 *
 * Font units: 1000/em, ascender = cap height = 750, descender = -250, and
 * y is flipped so the ascender sits at 0 and the baseline at 750. The
 * viewBox covers the whole em box, so at `height: 1em` the SVG occupies
 * exactly the space the text did. `vertical-align: -0.28em` (rather than
 * the -0.25em descender) lands the letters where the old text drew them:
 * the webfont's taller line metrics sat its baseline ~0.03em lower than
 * the Inter line the SVG now shares.
 */
const ADVANCE = 3015;
const GLYPHS = [
  { x: 0, d: "M500 190V0H64V750H285V456H486V281H285V190Z" },
  { x: 535, d: "M293 560V0H64V750H485V560Z" },
  {
    x: 1021,
    d: "M438 766C671 766 836 599 836 376C836 154 671 -13 438 -13C206 -13 41 154 41 376C41 599 206 766 438 766ZM438 558C334 558 265 479 265 376C265 273 334 195 438 195C542 195 612 273 612 376C612 479 542 558 438 558Z",
  },
  { x: 1836, d: "M942 0 779 350 607 21H573L403 345L243 0H2L373 761H399L590 381L780 761H806L1177 0Z" },
];

/**
 * Uses `currentColor`, so it drops into any surrounding color context —
 * dark on a light header, white over a hero photo, sidebar tones — without
 * per-page overrides.
 */
export function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const tracking = TRACKING[size];
  // CSS letter-spacing trails every letter, the last one included — kept so the width matches the old text exactly.
  const width = ADVANCE + GLYPHS.length * tracking;

  return (
    <span className={cn("inline-block", SIZES[size], className)}>
      <svg
        viewBox={`0 0 ${width} 1000`}
        role="img"
        aria-label="Flow"
        fill="currentColor"
        className="inline-block h-[1em] w-auto align-[-0.28em]"
      >
        {GLYPHS.map((glyph, i) => (
          <path key={i} d={glyph.d} transform={`translate(${glyph.x + i * tracking} 0)`} />
        ))}
      </svg>
    </span>
  );
}
