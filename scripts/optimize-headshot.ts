// Regenerates the landing page headshot variants: bun scripts/optimize-headshot.ts
import { resolve } from "node:path";
import sharp from "sharp";

const dir = resolve(import.meta.dirname, "../public/images");
const source = sharp(resolve(dir, "strelsov-headshot.png"));

for (const width of [416, 480, 576]) {
  const resized = source.clone().resize(width);
  for (const [format, quality] of [
    ["webp", 80],
    ["avif", 65],
  ] as const) {
    const name = `strelsov-headshot-${width}w.${format}`;
    const { size } = await resized
      .clone()
      .toFormat(format, { quality })
      .toFile(resolve(dir, name));
    console.log(`✓ ${name} — ${(size / 1024).toFixed(1)} KB`);
  }
}
