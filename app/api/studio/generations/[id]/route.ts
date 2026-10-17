// GET /api/studio/generations/:id — returns a generation, advancing it with the AI provider first
// when it is still pending (completion, failure + refund, timeout). → { generation, balance }
import type { NextRequest } from 'next/server';
import { requireUserRow } from '@/lib/studio/auth';
import { HttpError, enforceRateLimit, json, route } from '@/lib/studio/http';
import { advanceGeneration, getBalance, getUserGeneration, isPendingStatus, rowToDTO } from '@/lib/studio/generations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route<{ params: { id: string } }>(async (_req: NextRequest, { params }) => {
  const user = await requireUserRow();
  // Generous: a chat polling a few generations every ~2 s stays far below this.
  enforceRateLimit(`studio:poll:${user.id}`, 300, 60_000);

  const id = String(params?.id || '');
  let row = await getUserGeneration(user.id, id);
  if (!row) throw new HttpError(404, 'not_found', 'Generation not found');

  if (isPendingStatus(row.status) || (row.status === 'failed' && !row.refunded)) {
    row = await advanceGeneration(row);
    // Deleted meanwhile (its conversation was removed while we were polling).
    if (!row || row.user_id !== user.id) throw new HttpError(404, 'not_found', 'Generation not found');
  }

  // Read after any refund so the client's balance is accurate.
  const balance = await getBalance(user.id);
  return json({ generation: rowToDTO(row), balance });
});
