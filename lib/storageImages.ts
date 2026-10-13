"use client";

const BUCKET = "product-images";

export function storagePathFromPublicUrl(
  publicUrl: string | null | undefined
): string | null {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = url.pathname.indexOf(marker);

    if (index === -1) return null;

    const encodedPath = url.pathname.slice(index + marker.length);
    if (!encodedPath) return null;

    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

export function storagePathsFromUrls(
  urls: Array<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      urls
        .map(storagePathFromPublicUrl)
        .filter((path): path is string => !!path)
    )
  );
}
