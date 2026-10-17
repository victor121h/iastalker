import { getCurrentUser } from '@/lib/studio/auth';
import { json, route } from '@/lib/studio/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/studio/auth/me → {user} or {user:null}. Never 401. */
export const GET = route(async () => {
  const user = await getCurrentUser();
  return json({ user });
});
