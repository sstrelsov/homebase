// utils/getMaskPixels.ts
export async function getMaskPixels(src: string) {
  // 1) Load the image
  const img = await loadImage(src);

  // 2) Create an offscreen canvas to copy image data
  const canvas = document.createElement("canvas");
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // 3) Grab all pixel data
  const imageData = ctx.getImageData(0, 0, width, height).data; // Uint8ClampedArray
  console.log("pixel 0,0 alpha:", imageData[3]); // top-left corner
  console.log(
    "pixel w/2,h/2 alpha:",
    imageData[((height / 2) * width + width / 2) * 4 + 3]
  );
  return {
    imageData,
    width,
    height,
  };
}

// Helper to load an image (returns a Promise<HTMLImageElement>)
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // if needed
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
