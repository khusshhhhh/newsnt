import type { Department } from "@/lib/department";

/** Static fallback for departments with no admin-uploaded hero yet — AI-generated mood photography matching the site's monochrome aesthetic. */
export const FALLBACK_HERO: Partial<Record<Department, string>> = {
  "door-hardware": "/images/door-hardware-hero.png",
};
