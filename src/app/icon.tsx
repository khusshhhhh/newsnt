import { ImageResponse } from "next/og";
import { brandIconOptions } from "@/lib/brand-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const { element, options } = await brandIconOptions(size.width, true);
  return new ImageResponse(element, options);
}
