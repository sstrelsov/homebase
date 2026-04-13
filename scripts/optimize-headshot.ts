import sharp from "sharp";
import { resolve } from "node:path";

const INPUT = resolve(import.meta.dirname, "../public/images/strelsov-headshot.png");
const OUT_DIR = resolve(import.meta.dirname, "../public/images");

const WIDTHS = [416, 480, 576];
const FORMATS: Array<{ ext: string; options: Parameters<ReturnType<typeof sharp>["webp"]>[0] | Parameters<ReturnType<typeof sharp>["avif"]>[0]; method: "webp" | "avif" }> = [
  { ext: "webp", options: { quality: 80 }, method: "webp" },
  { ext: "avif", options: { quality: 65 }, method: "avif" },
];

for (const width of WIDTHS) {
  for (const { ext, options, method } of FORMATS) {
    const out = resolve(OUT_DIR, `strelsov-headshot-${width}w.${ext}`);
    await sharp(INPUT)
      .resize(width)
      [method](options as any)
      .toFile(out);
    const { size } = await Bun.file(out).stat();
    console.log(`✓ ${out.split("/").pop()} — ${(size! / 1024).toFixed(1)} KB`);
  }
}
