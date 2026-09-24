import type { StaticImageData } from "next/image";
import type { Department } from "@/lib/department";
import doorHardwareHero from "@/assets/images/door-hardware-hero.webp";

/** Static fallback for departments with no admin-uploaded hero yet — AI-generated mood photography matching the site's monochrome aesthetic. */
export const FALLBACK_HERO: Partial<Record<Department, StaticImageData>> = {
  "door-hardware": doorHardwareHero,
};