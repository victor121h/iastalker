// Client-side preparation of reference images: validation, downscaling with a canvas to
// REFERENCE_MAX_EDGE and JPEG encoding under MAX_REFERENCE_BYTES, returned as a data URL.
import { MAX_REFERENCE_BYTES, REFERENCE_MAX_EDGE } from '@/lib/studio/plans';

export const ACCEPTED_REFERENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const REFERENCE_ACCEPT_ATTR = ACCEPTED_REFERENCE_TYPES.join(',');
/** Largest source file we try to decode in the browser. */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

export type ReferenceProblem = 'unsupported' | 'too_large' | 'unreadable';

export class ReferenceImageError extends Error {
  constructor(public reason: ReferenceProblem) {
    super(reason);
  }
}

export interface PreparedReference {
  dataUrl: string;
  bytes: number;
  width: number;
  height: number;
}

const EXTENSION_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** MIME type of a picked/dropped/pasted file (falls back to the extension when the OS gives none). */
export function referenceMimeOf(file: File | Blob): string {
  if (file.type) return file.type.toLowerCase();
  const name = 'name' in file && typeof file.name === 'string' ? file.name : '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_TYPES[ext] || '';
}

export function isAcceptedReference(file: File | Blob): boolean {
  return ACCEPTED_REFERENCE_TYPES.includes(referenceMimeOf(file));
}

/** First image file in a FileList / DataTransfer list, or the first file at all (to report it). */
export function pickImageFile(files: FileList | File[] | null | undefined): File | null {
  if (!files) return null;
  const list = Array.from(files as ArrayLike<File>);
  return list.find((f) => referenceMimeOf(f).startsWith('image/')) || list[0] || null;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ReferenceImageError('unreadable'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) return resolve(blob);
          try {
            resolve(dataUrlToBlob(canvas.toDataURL('image/jpeg', quality)));
          } catch {
            reject(new ReferenceImageError('unreadable'));
          }
        },
        'image/jpeg',
        quality,
      );
    } catch {
      reject(new ReferenceImageError('unreadable'));
    }
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(b64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new ReferenceImageError('unreadable')));
    reader.onerror = () => reject(new ReferenceImageError('unreadable'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscales an image so its longest edge is at most REFERENCE_MAX_EDGE and encodes it as JPEG
 * (~0.9 quality), lowering quality / size until it fits MAX_REFERENCE_BYTES.
 * `skipTypeCheck` is used for images we fetched from our own results (e.g. demo SVGs).
 */
export async function prepareReference(blob: Blob, opts: { skipTypeCheck?: boolean } = {}): Promise<PreparedReference> {
  if (!opts.skipTypeCheck && !isAcceptedReference(blob)) throw new ReferenceImageError('unsupported');
  if (blob.size > MAX_SOURCE_BYTES) throw new ReferenceImageError('too_large');

  const img = await loadImage(blob);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) throw new ReferenceImageError('unreadable');

  let scale = Math.min(1, REFERENCE_MAX_EDGE / Math.max(srcW, srcH));
  let quality = 0.9;
  for (let attempt = 0; attempt < 8; attempt++) {
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ReferenceImageError('unreadable');
    // JPEG has no alpha: flatten transparent PNG/WebP onto white instead of black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    const out = await canvasToBlob(canvas, quality);
    if (out.size <= MAX_REFERENCE_BYTES) {
      return { dataUrl: await blobToDataUrl(out), bytes: out.size, width, height };
    }
    if (quality > 0.7) quality = Math.round((quality - 0.1) * 10) / 10;
    else scale *= 0.8;
  }
  throw new ReferenceImageError('too_large');
}

/**
 * Re-creates an uploadable reference from an image URL (used by "Regenerate" when the original
 * reference was an uploaded file). Throws when the image cannot be fetched (e.g. CORS).
 */
export async function referenceFromUrl(url: string): Promise<PreparedReference> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new ReferenceImageError('unreadable');
  const blob = await res.blob();
  if (isAcceptedReference(blob) && blob.size <= MAX_REFERENCE_BYTES) {
    return { dataUrl: await blobToDataUrl(blob), bytes: blob.size, width: 0, height: 0 };
  }
  return prepareReference(blob, { skipTypeCheck: true });
}
