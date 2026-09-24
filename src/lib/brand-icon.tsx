import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Satoshi Black — the site's heading face — read once at module scope. The
// .otf is kept for this alone: ImageResponse (Satori) can't read WOFF2, which
// is what the pages themselves load (layout.tsx).
const satoshiBlack = readFile(join(process.cwd(), "src/font/Satoshi-Black.otf"));

/** The "F" monogram used for the favicon and the Apple touch icon. */
export async function brandIconOptions(size: number, rounded: boolean) {
  return {
    element: (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          borderRadius: rounded ? size * 0.22 : 0,
          color: "#ffffff",
          fontFamily: "Satoshi",
          fontSize: size * 0.72,
          fontWeight: 900,
          // Optical centring: cap-height glyphs sit a touch low in their box.
          paddingBottom: size * 0.04,
          letterSpacing: "-0.02em",
        }}
      >
        F
      </div>
    ),
    options: {
      width: size,
      height: size,
      fonts: [{ name: "Satoshi", data: await satoshiBlack, weight: 900 as const, style: "normal" as const }],
    },
  };
}
