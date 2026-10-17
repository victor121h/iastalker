import { destroySession } from '@/lib/studio/auth';
import { json, route } from '@/lib/studio/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/studio/auth/logout → {ok:true}. Safe to call when not logged in. */
export const POST = route(async () => {
  await destroySession();
  return json({ ok: true as const });
});
