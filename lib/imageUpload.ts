"use client";

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1500;
const WEBP_QUALITY = 0.84;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not optimize the selected image."));
        }
      },
      "image/webp",
      WEBP_QUALITY
    );
  });
}

export async function optimizeProductImage(
  file: File
): Promise<File> {
  const image = await loadImage(file);

  const scale = Math.min(
    1,
    MAX_WIDTH / image.naturalWidth,
    MAX_HEIGHT / image.naturalHeight
  );

  const width = Math.max(
    1,
    Math.round(image.naturalWidth * scale)
  );

  const height = Math.max(
    1,
    Math.round(image.naturalHeight * scale)
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image optimization is unavailable in this browser.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas);

  const baseName =
    file.name.replace(/\.[^.]+$/, "") || "product-image";

  return new File(
    [blob],
    `${baseName}.webp`,
    {
      type: "image/webp",
      lastModified: Date.now(),
    }
  );
}
