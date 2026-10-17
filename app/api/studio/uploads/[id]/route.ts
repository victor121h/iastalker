// GET /api/studio/uploads/:id — serves a reference image uploaded by the current user (owner only).
import type { NextRequest } from 'next/server';
import { requireUserRow } from '@/lib/studio/auth';
import { query } from '@/lib/studio/db';
import { HttpError, route } from '@/lib/studio/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

export const GET = route<{ params: { id: string } }>(async (_req: NextRequest, { params }) => {
  const user = await requireUserRow();
  const id = String(params?.id || '');
  if (!ID_RE.test(id)) throw new HttpError(404, 'not_found', 'File not found');

  const { rows } = await query<{ mime: string; data: Buffer }>(
    'SELECT mime, data FROM studio_uploads WHERE id = $1 AND user_id = $2',
    [id, user.id],
  );
  const file = rows[0];
  if (!file) throw new HttpError(404, 'not_found', 'File not found');

  const mime = ALLOWED_MIME.includes(file.mime) ? file.mime : 'application/octet-stream';
  const bytes = new Uint8Array(file.data);
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
});
