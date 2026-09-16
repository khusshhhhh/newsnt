"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";

const SLIDE_INTERVAL_MS = 3500;

/**
 * Auto-advancing crossfade slider for an image gallery (category cards,
 * series hero banners). Pauses on hover so the image under the cursor
 * doesn't change mid-look, and degrades to a single static image when
 * there's nothing to rotate through.
 */
export function ImageSlider({
  images,
  alt,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  priority = false,
  dots = true,
}: {
  images: string[];
  alt: string;
  sizes?: string;
  priority?: boolean;
  dots?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (images.length < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length, paused]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority && i === 0}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className={`object-cover transition-[opacity,transform] duration-1000 ease-in-out group-hover:scale-105 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {dots && images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
