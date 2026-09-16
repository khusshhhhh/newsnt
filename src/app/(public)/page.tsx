import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { departmentCopy, departmentHref, type Department } from "@/lib/department";
import { mediaUrl } from "@/lib/supabase/storage";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Aakar — Tapware, Sanitaryware & Door Hardware",
};

async function getHeroImage(department: Department) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("series")
    .select("hero_image_url")
    .eq("department", department)
    .eq("is_published", true)
    .not("hero_image_url", "is", null)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.hero_image_url ?? null;
}

// Static fallbacks for departments with no admin-uploaded hero yet — AI-generated
// mood photography matching the site's monochrome, architectural aesthetic.
const FALLBACK_HERO: Record<Department, string | null> = {
  "sanitary-tapware": null,
  "door-hardware": "/images/door-hardware-hero.png",
};

export default async function GatewayPage() {
  const [tapwareHero, hardwareHero] = await Promise.all([
    getHeroImage("sanitary-tapware"),
    getHeroImage("door-hardware"),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-center">
        <span className="font-heading text-xl font-black tracking-[0.08em] text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
          AAKAR
        </span>
      </header>

      <main className="flex min-h-screen flex-col sm:flex-row">
        <GatewayPanel
          department="sanitary-tapware"
          heroImage={tapwareHero ? mediaUrl(tapwareHero) : FALLBACK_HERO["sanitary-tapware"]}
          eyebrow="01"
        />
        <GatewayPanel
          department="door-hardware"
          heroImage={hardwareHero ? mediaUrl(hardwareHero) : FALLBACK_HERO["door-hardware"]}
          eyebrow="02"
        />
      </main>

      <SiteFooter />
    </div>
  );
}

function GatewayPanel({
  department,
  heroImage,
  eyebrow,
}: {
  department: Department;
  heroImage: string | null;
  eyebrow: string;
}) {
  const copy = departmentCopy(department);

  return (
    <Link
      href={departmentHref(department)}
      className="group relative flex min-h-[60vh] flex-1 flex-col justify-end overflow-hidden bg-foreground sm:min-h-screen"
    >
      <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="(min-width: 640px) 50vw, 100vw"
            className="animate-ken-burns object-cover opacity-90"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 transition-opacity duration-500 group-hover:opacity-80" />

      <Reveal className="relative z-10 p-8 pb-16 sm:p-12 sm:pb-20">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/50">{eyebrow}</span>
        <h2 className="mt-3 font-heading text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl md:text-6xl">
          {copy.label}
        </h2>
        <p className="mt-3 max-w-sm text-white/70">{copy.tagline}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
          Enter
          <span aria-hidden className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">
            →
          </span>
        </span>
      </Reveal>
    </Link>
  );
}
