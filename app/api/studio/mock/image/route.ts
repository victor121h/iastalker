// GET /api/studio/mock/image?ratio=1:1|9:16|16:9&seed=<id>
// Deterministic abstract "fire" artwork used as the result of demo (mock provider) image
// generations. The seed only feeds a PRNG — no request text is ever written into the SVG.
import type { NextRequest } from 'next/server';
import { route } from '@/lib/studio/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SIZES: Record<string, [number, number]> = {
  '1:1': [1024, 1024],
  '9:16': [768, 1365],
  '16:9': [1365, 768],
};

const PALETTE = ['#FF1F4B', '#C8102E', '#FF4A2B', '#FF6A1A', '#FFB23F', '#F5C451', '#E0115F', '#FF8A1F'];

/** FNV-1a 32-bit hash. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG → floats in [0, 1). */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number) => (Math.round(v * 10) / 10).toString();

function renderSvg(width: number, height: number, seed: number): string {
  const rand = prng(seed);
  const between = (min: number, max: number) => min + rand() * (max - min);
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)];
  const short = Math.min(width, height);
  const long = Math.max(width, height);

  const defs: string[] = [];
  const layers: string[] = [];

  // Background: deep red-black diagonal wash.
  const angle = between(0, 1);
  defs.push(
    `<linearGradient id="bg" x1="${n(angle)}" y1="0" x2="${n(1 - angle)}" y2="1">` +
      '<stop offset="0" stop-color="#14070A"/><stop offset="0.55" stop-color="#0A0507"/>' +
      '<stop offset="1" stop-color="#1B0A0E"/></linearGradient>',
  );
  layers.push(`<rect width="${width}" height="${height}" fill="url(#bg)"/>`);

  // Blurred glowing orbs.
  defs.push(
    `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n(short * 0.07)}"/></filter>`,
  );
  const orbCount = 5 + Math.floor(rand() * 3);
  const orbs: string[] = [];
  for (let i = 0; i < orbCount; i++) {
    const color = pick(PALETTE);
    defs.push(
      `<radialGradient id="o${i}"><stop offset="0" stop-color="${color}" stop-opacity="${n(between(0.75, 0.95))}"/>` +
        `<stop offset="0.5" stop-color="${color}" stop-opacity="${n(between(0.3, 0.5))}"/>` +
        `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    );
    const r = between(short * 0.22, short * 0.5);
    orbs.push(
      `<circle cx="${n(between(-0.1, 1.1) * width)}" cy="${n(between(0.15, 1.1) * height)}" r="${n(r)}" fill="url(#o${i})"/>`,
    );
  }
  layers.push(`<g filter="url(#soft)" style="mix-blend-mode:screen">${orbs.join('')}</g>`);

  // Silk ribbons sweeping across the canvas.
  defs.push(
    '<linearGradient id="silk" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#C8102E" stop-opacity="0"/>' +
      '<stop offset="0.35" stop-color="#FF1F4B"/><stop offset="0.7" stop-color="#FF6A1A"/>' +
      '<stop offset="1" stop-color="#FFB23F" stop-opacity="0"/></linearGradient>',
    `<filter id="silkBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${n(short * 0.012)}"/></filter>`,
  );
  const ribbons: string[] = [];
  const ribbonCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < ribbonCount; i++) {
    const y0 = between(0.35, 1.05) * height;
    const y1 = between(-0.05, 0.75) * height;
    const c1 = [between(0.15, 0.45) * width, between(-0.2, 1.2) * height];
    const c2 = [between(0.55, 0.85) * width, between(-0.2, 1.2) * height];
    ribbons.push(
      `<path d="M ${n(-0.1 * width)} ${n(y0)} C ${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(1.1 * width)} ${n(y1)}" ` +
        `stroke-width="${n(between(short * 0.015, short * 0.06))}" stroke-opacity="${n(between(0.35, 0.75))}"/>`,
    );
  }
  layers.push(
    `<g fill="none" stroke="url(#silk)" stroke-linecap="round" filter="url(#silkBlur)" style="mix-blend-mode:screen">${ribbons.join('')}</g>`,
  );

  // A rising flame made of a few overlapping teardrops.
  defs.push(
    '<linearGradient id="flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFB23F" stop-opacity="0.95"/>' +
      '<stop offset="0.45" stop-color="#FF6A1A" stop-opacity="0.85"/><stop offset="0.8" stop-color="#FF1F4B" stop-opacity="0.55"/>' +
      '<stop offset="1" stop-color="#C8102E" stop-opacity="0"/></linearGradient>',
    `<filter id="flameBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n(short * 0.018)}"/></filter>`,
  );
  const fx = between(0.35, 0.65) * width;
  const fy = between(0.72, 0.86) * height;
  const fh = between(0.42, 0.58) * Math.min(height, long * 0.75);
  const tongues: string[] = [];
  for (let i = 0; i < 4; i++) {
    const h = fh * between(0.55, 1);
    const w = h * between(0.32, 0.45);
    const cx = fx + between(-0.08, 0.08) * short;
    const rot = between(-14, 14);
    tongues.push(
      `<path transform="rotate(${n(rot)} ${n(cx)} ${n(fy)})" opacity="${n(between(0.55, 0.9))}" d="M ${n(cx)} ${n(fy - h)} ` +
        `C ${n(cx + w * 0.6)} ${n(fy - h * 0.45)} ${n(cx + w * 0.55)} ${n(fy)} ${n(cx)} ${n(fy)} ` +
        `C ${n(cx - w * 0.55)} ${n(fy)} ${n(cx - w * 0.6)} ${n(fy - h * 0.45)} ${n(cx)} ${n(fy - h)} Z"/>`,
    );
  }
  layers.push(`<g fill="url(#flame)" filter="url(#flameBlur)" style="mix-blend-mode:screen">${tongues.join('')}</g>`);

  // Embers drifting upwards.
  const embers: string[] = [];
  const emberCount = 22 + Math.floor(rand() * 18);
  for (let i = 0; i < emberCount; i++) {
    embers.push(
      `<circle cx="${n(between(0.05, 0.95) * width)}" cy="${n(between(0.05, 0.9) * height)}" r="${n(between(1.2, 3.6) * (short / 1024))}" ` +
        `fill="${pick(['#FFB23F', '#F5C451', '#FF8A1F', '#FFE2B8'])}" opacity="${n(between(0.25, 0.9))}"/>`,
    );
  }
  defs.push('<filter id="emberGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="1.2"/></filter>');
  layers.push(`<g filter="url(#emberGlow)">${embers.join('')}</g>`);

  // Vignette + film grain.
  defs.push(
    '<radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity="0.72"/></radialGradient>',
    `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed % 1000}" stitchTiles="stitch"/>` +
      '<feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.09"/></feComponentTransfer></filter>',
  );
  layers.push(`<rect width="${width}" height="${height}" fill="url(#vignette)"/>`);
  layers.push(`<rect width="${width}" height="${height}" filter="url(#grain)" style="mix-blend-mode:overlay"/>`);

  // Small "DEMO" watermark (bottom-right).
  const fontSize = Math.round(short * 0.02);
  const padX = fontSize * 0.9;
  const pillW = fontSize * 4.6 + padX * 2;
  const pillH = fontSize * 2.1;
  const margin = short * 0.035;
  const px = width - margin - pillW;
  const py = height - margin - pillH;
  const tracking = fontSize * 0.32;
  layers.push(
    `<g aria-label="Demo">` +
      `<rect x="${n(px)}" y="${n(py)}" width="${n(pillW)}" height="${n(pillH)}" rx="${n(pillH / 2)}" fill="#0A0507" fill-opacity="0.55" stroke="#FFFFFF" stroke-opacity="0.18"/>` +
      // + tracking/2: letter-spacing also follows the last letter, which would push the word left.
      `<text x="${n(px + pillW / 2 + tracking / 2)}" y="${n(py + pillH / 2)}" fill="#FBEFF0" fill-opacity="0.82" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" ` +
      `font-size="${fontSize}" font-weight="600" letter-spacing="${n(tracking)}" text-anchor="middle" dominant-baseline="central">DEMO</text>` +
      `</g>`,
  );

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Demo artwork">` +
    `<defs>${defs.join('')}</defs>${layers.join('')}</svg>`
  );
}

export const GET = route(async (req: NextRequest) => {
  const ratio = req.nextUrl.searchParams.get('ratio') || '1:1';
  const [width, height] = SIZES[ratio] || SIZES['1:1'];
  const seed = hash((req.nextUrl.searchParams.get('seed') || 'ember').slice(0, 128));
  const svg = renderSvg(width, height, seed);

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
});
