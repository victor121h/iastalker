// /api/studio/conversations/:id (owner only; 404 for anyone else)
//   GET     → { conversation, generations }   (latest 300 generations, oldest first)
//   PATCH   { title } (1..80 chars) → { conversation }
//   DELETE  → { ok: true }   (in-progress generations are cancelled and refunded)
import type { NextRequest } from 'next/server';
import { requireUserRow } from '@/lib/studio/auth';
import { HttpError, json, readJson, route } from '@/lib/studio/http';
import {
  CONVERSATION_TITLE_MAX,
  deleteConversation,
  getConversation,
  listConversationGenerations,
  renameConversation,
  sanitizeText,
} from '@/lib/studio/generations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

function notFound(): HttpError {
  return new HttpError(404, 'not_found', 'Conversation not found');
}

export const GET = route<Ctx>(async (_req: NextRequest, { params }) => {
  const user = await requireUserRow();
  const conversation = await getConversation(user.id, String(params?.id || ''));
  if (!conversation) throw notFound();
  const generations = await listConversationGenerations(conversation.id);
  return json({ conversation, generations });
});

export const PATCH = route<Ctx>(async (req: NextRequest, { params }) => {
  const user = await requireUserRow();
  const body = await readJson<{ title?: unknown }>(req, 4 * 1024);
  if (typeof body.title !== 'string') {
    throw new HttpError(400, 'invalid_input', 'title is required', { field: 'title' });
  }
  const title = sanitizeText(body.title, { singleLine: true });
  if (title.length < 1 || title.length > CONVERSATION_TITLE_MAX) {
    throw new HttpError(400, 'invalid_input', `title must have 1 to ${CONVERSATION_TITLE_MAX} characters`, {
      field: 'title',
    });
  }
  const conversation = await renameConversation(user.id, String(params?.id || ''), title);
  if (!conversation) throw notFound();
  return json({ conversation });
});

export const DELETE = route<Ctx>(async (_req: NextRequest, { params }) => {
  const user = await requireUserRow();
  const deleted = await deleteConversation(user.id, String(params?.id || ''));
  if (!deleted) throw notFound();
  return json({ ok: true as const });
});
