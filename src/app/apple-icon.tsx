import { ImageResponse } from "next/og";
import { brandIconOptions } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own rounded mask, so this one stays square.
export default async function AppleIcon() {
  const { element, options } = await brandIconOptions(size.width, false);
  return new ImageResponse(element, options);
}
