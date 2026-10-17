// GET /api/studio/conversations — the user's conversations, most recent first (max 100).
import { requireUserRow } from '@/lib/studio/auth';
import { json, route } from '@/lib/studio/http';
import { listConversations } from '@/lib/studio/generations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async () => {
  const user = await requireUserRow();
  const conversations = await listConversations(user.id);
  return json({ conversations });
});
