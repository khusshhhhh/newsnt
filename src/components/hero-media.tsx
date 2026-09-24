"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { Volume2, VolumeX } from "lucide-react";
import { blurFor } from "@/lib/blur-placeholder";
import { cn } from "@/lib/utils";

/**
 * The hero's visual panel: a looping ambient product video when one is
 * configured for the department, falling back to a ken-burns still image
 * otherwise. Sound defaults off (autoplaying video must be muted to play in
 * most browsers); the toggle only appears for a clip that has an audio track.
 *
 * `videoSources` are tried in order, so list the smallest first: a
 * phone-sized cut (with `media`), AV1 before H.264. `poster` fills the frame
 * until the first frame decodes instead of an empty box.
 *
 * `chapters` labels equal-length segments of a multi-shot video (one per
 * design/finish it cuts between) and renders Instagram-story-style progress
 * bars synced to playback via `timeupdate`, with the active segment's label
 * replacing the static caption.
 *
 * `lazyPlay` defers playback (and full preload) until the panel scrolls into
 * view, for video placed below the fold rather than autoplaying in the hero.
 */
export type VideoSource = { src: string; type: string; media?: string };

export function HeroMedia({
  videoSources,
  poster,
  hasAudio = false,
  imageSrc,
  imageAlt,
  caption,
  chapters,
  className,
  lazyPlay = false,
}: {
  videoSources?: VideoSource[];
  poster?: StaticImageData;
  hasAudio?: boolean;
  imageSrc?: string | StaticImageData;
  imageAlt: string;
  caption?: string;
  chapters?: string[];
  className?: string;
  lazyPlay?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  function toggleSound() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !chapters || chapters.length === 0) return;
    function handleTimeUpdate() {
      if (!el || !el.duration) return;
      setProgress(el.currentTime / el.duration);
    }
    el.addEventListener("timeupdate", handleTimeUpdate);
    return () => el.removeEventListener("timeupdate", handleTimeUpdate);
  }, [chapters]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !lazyPlay) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazyPlay]);

  const hasVideo = Boolean(videoSources && videoSources.length > 0);
  const hasChapters = Boolean(chapters && chapters.length > 0);
  const activeChapterIndex = chapters
    ? Math.min(chapters.length - 1, Math.floor(progress * chapters.length))
    : -1;
  const withinChapterProgress = chapters ? Math.min(1, (progress * chapters.length) % 1) : 0;

  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-border bg-muted shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] sm:aspect-[4/5] md:aspect-[3/4]",
        className
      )}
    >
      {hasVideo && videoSources ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster={poster?.src}
          autoPlay={!lazyPlay}
          muted
          loop
          playsInline
          // Below the fold there's a poster to show, so fetch nothing until it scrolls into view.
          preload={lazyPlay ? (poster ? "none" : "metadata") : "auto"}
          aria-label={imageAlt}
        >
          {videoSources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} media={source.media} />
          ))}
        </video>
      ) : imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          preload
          sizes="(min-width: 1024px) 40vw, 90vw"
          placeholder="blur"
          blurDataURL={blurFor(imageSrc)}
          className="animate-ken-burns object-cover"
        />
      ) : null}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/5"
      />

      {hasChapters && chapters && (
        <div className="absolute left-4 right-16 top-4 flex gap-1.5">
          {chapters.map((label, i) => (
            <div key={label} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-white"
                style={{
                  width:
                    i < activeChapterIndex
                      ? "100%"
                      : i === activeChapterIndex
                        ? `${withinChapterProgress * 100}%`
                        : "0%",
                  transition: i === activeChapterIndex ? "none" : "width 0.3s ease-out",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {hasVideo && hasAudio && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Unmute video" : "Mute video"}
          aria-pressed={!muted}
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      )}

      {(caption || hasChapters) && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
          <p
            key={hasChapters ? activeChapterIndex : caption}
            className="animate-fade-in text-xs font-semibold uppercase tracking-[0.2em] text-white/85"
          >
            {hasChapters && chapters ? chapters[activeChapterIndex] : caption}
          </p>
          {hasVideo && (
            <span className="flex shrink-0 items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-white/60">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-white" />
              </span>
              {hasChapters ? "Now showing" : "Concept film"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
