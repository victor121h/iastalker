'use client';

// Sidebar list of the user's conversations with thumbnails, relative times, the active highlight
// and rename / delete actions (each confirmed in a modal).
import { useEffect, useId, useState, type FormEvent } from 'react';
import type { GenerationType } from '@/lib/studio/plans';
import type { ConversationDTO } from '@/lib/studio/types';
import { useI18n } from '@/lib/studio/i18n/client';
import { ApiError } from '@/lib/studio/api-client';
import { Alert, Button, Field, Input, Modal, cx } from '@/components/studio/ui';
import { IconChat, IconImage, IconPencil, IconRefresh, IconTrash, IconVideo } from '@/components/studio/icons';
import { formatRelativeTime } from './utils';

/** Same limit as the API (CONVERSATION_TITLE_MAX). */
export const TITLE_MAX = 80;

export interface ConversationListProps {
  conversations: ConversationDTO[];
  state: 'loading' | 'ready' | 'error';
  activeId: string | null;
  /** Type of the latest generation of conversations we have loaded (for the fallback icon). */
  typeHints: Record<string, GenerationType | undefined>;
  onSelect: (id: string) => void;
  onRetry: () => void;
  /** Opens the rename / delete confirmation (rendered by ChatApp, outside the mobile drawer). */
  onRequestRename: (conversation: ConversationDTO) => void;
  onRequestDelete: (conversation: ConversationDTO) => void;
}

export function ConversationList({
  conversations,
  state,
  activeId,
  typeHints,
  onSelect,
  onRetry,
  onRequestRename,
  onRequestDelete,
}: ConversationListProps) {
  const { t, lang } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (state === 'loading' && conversations.length === 0) {
    return (
      <ul className="space-y-1.5 px-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
            <span className="h-10 w-10 flex-none rounded-lg studio-shimmer" />
            <span className="flex-1 space-y-1.5">
              <span className="block h-3 w-4/5 rounded studio-shimmer" />
              <span className="block h-2.5 w-1/3 rounded studio-shimmer" />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (state === 'error' && conversations.length === 0) {
    return (
      <div className="space-y-2 px-2 py-3 text-sm text-studio-muted">
        <p>{t('chat.sidebar.loadError')}</p>
        <Button size="sm" variant="ghost" onClick={onRetry}>
          <IconRefresh size={15} />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return <p className="px-3 py-3 text-sm leading-relaxed text-studio-subtle">{t('chat.sidebar.empty')}</p>;
  }

  return (
    <ul className="space-y-0.5">
      {conversations.map((c) => {
        const active = c.id === activeId;
        const title = c.title || t('chat.sidebar.untitled');
        return (
          <li key={c.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl py-2 pl-2 pr-[4.5rem] text-left transition-colors lg:pr-2 lg:group-focus-within:pr-[4.5rem] lg:group-hover:pr-[4.5rem]',
                active ? 'bg-white/[0.07] ring-1 ring-inset ring-studio-red/30' : 'hover:bg-white/[0.04]',
              )}
            >
              {active && (
                <span aria-hidden="true" className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full studio-gradient-bg" />
              )}
              <Thumb conversation={c} type={typeHints[c.id]} />
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate text-sm', active ? 'font-semibold text-studio-text' : 'text-studio-text/90')}>
                  {title}
                </span>
                <span className="block truncate text-xs text-studio-subtle">
                  {formatRelativeTime(c.updatedAt, now, lang, t('chat.time.justNow'))}
                </span>
              </span>
            </button>
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onRequestRename(c)}
                aria-label={t('chat.sidebar.renameLabel', { title })}
                title={t('chat.sidebar.renameLabel', { title })}
                className="rounded-lg p-1.5 text-studio-subtle hover:bg-white/10 hover:text-studio-text"
              >
                <IconPencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(c)}
                aria-label={t('chat.sidebar.deleteLabel', { title })}
                title={t('chat.sidebar.deleteLabel', { title })}
                className="rounded-lg p-1.5 text-studio-subtle hover:bg-studio-red/15 hover:text-studio-red"
              >
                <IconTrash size={15} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Thumb({ conversation, type }: { conversation: ConversationDTO; type: GenerationType | undefined }) {
  const [broken, setBroken] = useState(false);
  const url = conversation.previewUrl;
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-10 w-10 flex-none rounded-lg border border-white/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-white/5 bg-studio-fire-soft text-studio-orange">
      {type === 'video' ? <IconVideo size={17} /> : type === 'image' ? <IconImage size={17} /> : <IconChat size={17} />}
    </span>
  );
}

export function RenameModal({
  conversation,
  onClose,
  onRename,
}: {
  conversation: ConversationDTO | null;
  onClose: () => void;
  onRename: (id: string, title: string) => Promise<void>;
}) {
  const { t, te } = useI18n();
  const titleId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conversation) {
      setValue(conversation.title);
      setError(null);
      setSaving(false);
    }
  }, [conversation]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!conversation || saving) return;
    const title = value.replace(/\s+/g, ' ').trim();
    if (!title) {
      setError(t('chat.rename.empty'));
      return;
    }
    if (title === conversation.title) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onRename(conversation.id, title);
      onClose();
    } catch (err) {
      setError(te(err instanceof ApiError ? err.code : 'internal'));
      setSaving(false);
    }
  }

  return (
    <Modal open={conversation !== null} onClose={onClose} size="sm" labelledBy={titleId}>
      <form onSubmit={submit} className="space-y-5 p-6">
        <h2 id={titleId} className="pr-8 font-display text-lg font-semibold text-studio-text">
          {t('chat.rename.title')}
        </h2>
        <Field label={t('chat.rename.label')} hint={t('chat.rename.hint', { max: TITLE_MAX })} error={error}>
          {(id) => (
            <Input
              id={id}
              value={value}
              autoFocus
              maxLength={TITLE_MAX}
              placeholder={t('chat.rename.placeholder')}
              onChange={(e) => setValue(e.target.value)}
              invalid={Boolean(error)}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteModal({
  conversation,
  onClose,
  onDelete,
}: {
  conversation: ConversationDTO | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t, te } = useI18n();
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (conversation) {
      setError(null);
      setDeleting(false);
    }
  }, [conversation]);

  async function confirm() {
    if (!conversation || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(conversation.id);
      onClose();
    } catch (err) {
      setError(te(err instanceof ApiError ? err.code : 'internal'));
      setDeleting(false);
    }
  }

  return (
    <Modal open={conversation !== null} onClose={onClose} size="sm" labelledBy={titleId}>
      <div className="space-y-4 p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-studio-red/15 text-studio-red">
          <IconTrash size={20} />
        </span>
        <h2 id={titleId} className="pr-8 font-display text-lg font-semibold text-studio-text">
          {t('chat.delete.title')}
        </h2>
        <p className="text-sm leading-relaxed text-studio-muted">
          {t('chat.delete.body', { title: conversation?.title || t('chat.sidebar.untitled') })}
        </p>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={deleting} autoFocus>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirm} loading={deleting}>
            {t('chat.delete.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
