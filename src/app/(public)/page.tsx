import type { Metadata } from "next";
import { getDepartmentHeroImage } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import type { Department } from "@/lib/department";
import { GatewayPanels, type GatewayPanelData } from "@/components/gateway-panels";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Aakar — Tapware, Sanitaryware & Door Hardware",
};

// Static fallbacks for departments with no admin-uploaded hero yet — AI-generated
// mood photography matching the site's monochrome, architectural aesthetic.
const FALLBACK_HERO: Record<Department, string | null> = {
  "sanitary-tapware": null,
  "door-hardware": "/images/door-hardware-hero.png",
};

export default async function GatewayPage() {
  const [tapwareHero, hardwareHero] = await Promise.all([
    getDepartmentHeroImage("sanitary-tapware"),
    getDepartmentHeroImage("door-hardware"),
  ]);

  const panels: GatewayPanelData[] = [
    {
      department: "sanitary-tapware",
      heroImage: tapwareHero ? mediaUrl(tapwareHero) : FALLBACK_HERO["sanitary-tapware"],
      eyebrow: "01",
    },
    {
      department: "door-hardware",
      heroImage: hardwareHero ? mediaUrl(hardwareHero) : FALLBACK_HERO["door-hardware"],
      eyebrow: "02",
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center px-6 sm:px-8 lg:px-12">
        <span className="text-white">
          <Logo size="lg" />
        </span>
      </header>

      <GatewayPanels panels={panels} />
    </div>
  );
}
