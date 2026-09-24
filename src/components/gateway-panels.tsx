"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { departmentCopy, departmentHref, type Department } from "@/lib/department";
import { blurFor } from "@/lib/blur-placeholder";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

export type GatewayPanelData = {
  department: Department;
  heroImage: string | StaticImageData | null;
  heroBlur?: string | null;
  eyebrow: string;
};

type PanelState = "idle" | "expanded" | "collapsed";

/**
 * The two-department homepage split. Desktop-only: hovering (or
 * keyboard-focusing) one panel grows it to 70% width and shrinks the other
 * to 30%, with the image, overlay, and text animating in step. Mobile stays
 * the original stacked 50/50 layout — there's no meaningful "hover" there.
 */
export function GatewayPanels({ panels }: { panels: GatewayPanelData[] }) {
  const [hovered, setHovered] = useState<Department | null>(null);

  return (
    <main id="main-content" className="flex min-h-screen flex-col sm:flex-row">
      {panels.map((panel) => {
        const state: PanelState =
          hovered === null ? "idle" : hovered === panel.department ? "expanded" : "collapsed";
        return (
          <GatewayPanel
            key={panel.department}
            {...panel}
            state={state}
            onEnter={() => setHovered(panel.department)}
            onLeave={() => setHovered((prev) => (prev === panel.department ? null : prev))}
          />
        );
      })}
    </main>
  );
}

const BASIS_CLASS: Record<PanelState, string> = {
  idle: "sm:basis-1/2",
  expanded: "sm:basis-[70%]",
  collapsed: "sm:basis-[30%]",
};

function GatewayPanel({
  department,
  heroImage,
  heroBlur,
  eyebrow,
  state,
  onEnter,
  onLeave,
}: GatewayPanelData & {
  state: PanelState;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const copy = departmentCopy(department);
  const expanded = state === "expanded";
  const collapsed = state === "collapsed";

  return (
    <Link
      href={departmentHref(department)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className={cn(
        "group relative flex min-h-[60vh] flex-col justify-end overflow-hidden bg-foreground",
        "sm:min-h-screen sm:flex-none",
        "motion-safe:sm:transition-[flex-basis] motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
        BASIS_CLASS[state]
      )}
    >
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-700 ease-out",
          expanded ? "scale-[1.08]" : collapsed ? "scale-[1.02]" : "group-hover:scale-[1.04]"
        )}
      >
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            preload
            sizes="(min-width: 640px) 70vw, 100vw"
            placeholder="blur"
            blurDataURL={blurFor(heroImage, heroBlur)}
            className={cn(
              "animate-ken-burns object-cover transition-[opacity,filter] duration-700 ease-out",
              collapsed ? "opacity-50 grayscale-[0.4]" : "opacity-90"
            )}
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]"
          />
        )}
      </div>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 transition-opacity duration-500",
          expanded && "opacity-70",
          collapsed && "opacity-100"
        )}
      />

      <Reveal
        className={cn(
          "relative z-10 origin-bottom-left p-8 pb-16 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-12 sm:pb-20",
          expanded && "sm:scale-[1.05]",
          collapsed && "sm:scale-[0.92]"
        )}
      >
        <span
          className={cn(
            "text-xs font-semibold tracking-[0.3em] text-white/50 transition-opacity duration-500",
            collapsed && "sm:opacity-0"
          )}
        >
          {eyebrow}
        </span>
        <h2 className="mt-3 font-heading text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl md:text-6xl">
          {copy.label}
        </h2>
        <p
          className={cn(
            "mt-3 max-w-sm text-white/70 transition-opacity duration-500",
            collapsed && "sm:opacity-0"
          )}
        >
          {copy.tagline}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
          Enter
          <span
            aria-hidden
            className={cn(
              "transition-transform duration-300 ease-out",
              expanded ? "translate-x-1.5" : "group-hover:translate-x-1.5"
            )}
          >
            →
          </span>
        </span>
      </Reveal>
    </Link>
  );
}
