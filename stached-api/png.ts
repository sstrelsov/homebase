// Just enough PNG for the link-preview card: reads 8-bit, non-interlaced RGB
// or RGBA (a browser screenshot, or our own), and writes RGB. node:zlib does
// the compressing, so there's nothing to install.
import { deflateSync, inflateSync } from "node:zlib";

/** An opaque picture, 3 bytes (RGB) a pixel, row by row. */
export interface Picture {
  width: number;
  height: number;
  data: Uint8Array;
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// Bytes a pixel for each color type we read: RGB, RGBA.
const CHANNELS: Record<number, number> = { 2: 3, 6: 4 };

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(file: Uint8Array): Picture {
  const bytes = Buffer.from(file.buffer, file.byteOffset, file.byteLength);
  if (!bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error("Not a PNG");
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  for (let at = 8; at < bytes.length; ) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.toString("latin1", at + 4, at + 8);
    const chunk = bytes.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      channels = CHANNELS[chunk[9]];
      if (chunk[8] !== 8 || !channels || chunk[12])
        throw new Error("Only 8-bit, non-interlaced RGB or RGBA PNGs");
    } else if (type === "IDAT") idat.push(chunk);
    else if (type === "IEND") break;
    at += length + 12;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? rows[row + x - channels] : 0;
      const b = y ? rows[row - stride + x] : 0;
      const c = x >= channels && y ? rows[row - stride + x - channels] : 0;
      // The row's filter: None, Sub, Up, Average or Paeth.
      let guess = 0;
      if (filter === 1) guess = a;
      else if (filter === 2) guess = b;
      else if (filter === 3) guess = (a + b) >> 1;
      else if (filter === 4) guess = paeth(a, b, c);
      rows[row + x] = line[x] + guess;
    }
  }

  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++)
    for (let k = 0; k < 3; k++) data[i * 3 + k] = rows[i * channels + k];
  return { width, height, data };
}

function chunk(type: string, body: Uint8Array) {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, "latin1");
  out.set(body, 8);
  out.writeUInt32BE(
    Bun.hash.crc32(out.subarray(4, 8 + body.length)),
    8 + body.length,
  );
  return out;
}

export function encodePng({ width, height, data }: Picture) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
  // Every row filtered against the one above ("Up"): the CRT's phosphor
  // columns run top to bottom, so most of each row becomes zeros.
  const stride = width * 3;
  const rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    rows[y * (stride + 1)] = 2;
    for (let x = 0; x < stride; x++)
      rows[y * (stride + 1) + 1 + x] =
        data[y * stride + x] - (y ? data[(y - 1) * stride + x] : 0);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", new Uint8Array()),
  ]);
}
