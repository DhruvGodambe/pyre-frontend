/* Web-optimize the delivered world art for production.
   Originals stay in /swisstransfer_*; this writes lean WebP into /public/world.
   Run: node scripts/optimize-art.mjs */
import sharp from "sharp";
import { statSync } from "node:fs";

const W = "public/world";
const kb = (p) => Math.round(statSync(p).size / 1024);

const jobs = [
  // Map: full-frame photo, no alpha needed. 3840w covers 4K crisply.
  { in: `${W}/map.png`, out: `${W}/map.webp`, width: 3840, q: 82 },
  // Interior backdrop.
  { in: `${W}/interiors/observatory.png`, out: `${W}/interiors/observatory.webp`, width: 2048, q: 80 },
  // Buildings: keep full 1484px (covers high-DPI display), alpha preserved.
  ...["bonfire", "vault", "forge", "immolated", "tavern", "exchange", "market", "gate"].map(
    (id) => ({ in: `${W}/buildings/${id}.png`, out: `${W}/buildings/${id}.webp`, width: 1484, q: 86 })
  ),
];

for (const j of jobs) {
  await sharp(j.in)
    .resize({ width: j.width, withoutEnlargement: true })
    .webp({ quality: j.q, effort: 6 })
    .toFile(j.out);
  console.log(`${j.out.padEnd(40)} ${String(kb(j.in)).padStart(6)} KB -> ${String(kb(j.out)).padStart(5)} KB`);
}
console.log("done");
