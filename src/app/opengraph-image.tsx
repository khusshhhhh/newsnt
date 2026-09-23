import { ImageResponse } from "next/og";

export const alt = "Flow — tapware, sanitaryware and door hardware";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card for any page without its own image (category, finish, search, projects…). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#111111",
          color: "#ffffff",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 900, letterSpacing: -4 }}>Flow</div>
        <div style={{ fontSize: 40, color: "#bbbbbb" }}>Tapware, sanitaryware and door hardware</div>
      </div>
    ),
    { ...size }
  );
}
