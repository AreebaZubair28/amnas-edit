"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

type StorefrontImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
};

function isSupabaseStorageImage(
  src: string
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL
      ?.replace(/\/+$/, "");

  return Boolean(
    supabaseUrl &&
      src.startsWith(
        `${supabaseUrl}/storage/v1/object/public/`
      )
  );
}

export default function StorefrontImage({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  priority = false,
  style,
}: StorefrontImageProps) {
  if (!isSupabaseStorageImage(src)) {
    /*
     * Admin still allows a manual external image URL as a fallback.
     * Unknown external hosts are intentionally left as a normal img
     * instead of opening Next's image optimizer to every remote domain.
     */
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Intentional fallback for manually entered external image hosts that are not configured for Next Image.
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={
          priority ? "eager" : "lazy"
        }
        decoding="async"
        fetchPriority={
          priority ? "high" : "auto"
        }
        style={style}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
      style={style}
    />
  );
}
