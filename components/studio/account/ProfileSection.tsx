'use client';

// Profile: editable display name, read-only email, member-since date and the language preference
// (applied to the UI immediately and saved to the account).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import { LANGS, isLang, type Lang } from '@/lib/studio/i18n/define';
import { SUPPORT_EMAIL } from '@/lib/studio/plans';
import type { PublicUser } from '@/lib/studio/types';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Button, Field, Input, Spinner, cx } from '@/components/studio/ui';
import { IconCheck, IconChevronDown, IconLock, IconUser } from '@/components/studio/icons';
import { ACCOUNT_NAME_MAX, cleanDisplayName } from './constants';
import { formatDate } from './format';
import { AccountSection, InfoItem } from './Section';

const SAVED_FLASH_MS = 2500;

function errorCode(err: unknown): string {
  return err instanceof ApiError ? err.code : 'internal';
}

export function ProfileSection({ user, onUnauthorized }: { user: PublicUser; onUnauthorized: () => void }) {
  const { t, lang } = useI18n();

  return (
    <AccountSection
      id="profile"
      icon={<IconUser size={20} />}
      title={t('account.profile.title')}
      subtitle={t('account.profile.subtitle')}
    >
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        <NameForm user={user} onUnauthorized={onUnauthorized} />
        <LanguageSelect onUnauthorized={onUnauthorized} />

        <InfoItem label={t('account.profile.email')}>
          <p className="flex min-w-0 items-center gap-2">
            <IconLock size={16} className="flex-none text-studio-subtle" />
            <span className="truncate" title={user.email}>
              {user.email}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-studio-subtle">
            {t('account.profile.emailHint')}{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="rounded text-studio-orange underline-offset-2 hover:underline"
            >
              {t('account.profile.emailHelp')}
            </a>
          </p>
        </InfoItem>

        <InfoItem label={t('account.profile.memberSince')}>
          <time dateTime={user.createdAt}>{formatDate(user.createdAt, lang)}</time>
        </InfoItem>
      </div>
    </AccountSection>
  );
}

function NameForm({ user, onUnauthorized }: { user: PublicUser; onUnauthorized: () => void }) {
  const { t, te } = useI18n();
  const { setUser } = useStudioSession();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow external updates (e.g. a fresh load) as long as the user is not mid-edit.
  const lastSaved = useRef(user.name);
  useEffect(() => {
    setName((current) => (cleanDisplayName(current) === lastSaved.current ? user.name : current));
    lastSaved.current = user.name;
  }, [user.name]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const cleaned = cleanDisplayName(name);
  const dirty = cleaned !== user.name;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!cleaned) {
      setError(t('account.profile.nameRequired'));
      inputRef.current?.focus();
      return;
    }
    if (cleaned.length > ACCOUNT_NAME_MAX) {
      setError(t('account.profile.nameTooLong', { max: ACCOUNT_NAME_MAX }));
      inputRef.current?.focus();
      return;
    }
    if (!dirty) return;

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { user: updated } = await studioApi.updateAccount({ name: cleaned });
      lastSaved.current = updated.name;
      setName(updated.name);
      setUser(updated);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), SAVED_FLASH_MS);
    } catch (err) {
      const code = errorCode(err);
      if (code === 'unauthorized') {
        onUnauthorized();
        return;
      }
      setError(te(code));
      inputRef.current?.focus();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="min-w-0">
      <Field
        label={t('account.profile.name')}
        error={error}
        hint={t('account.profile.nameHint', { max: ACCOUNT_NAME_MAX })}
      >
        {(id) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              id={id}
              name="name"
              autoComplete="name"
              value={name}
              maxLength={ACCOUNT_NAME_MAX}
              placeholder={t('account.profile.namePlaceholder')}
              invalid={!!error}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
                if (saved) setSaved(false);
              }}
            />
            <Button
              type="submit"
              variant={dirty ? 'primary' : 'secondary'}
              loading={saving}
              disabled={!dirty || saving}
              className="h-12 flex-none sm:w-auto"
            >
              {saved && !dirty ? <IconCheck size={16} strokeWidth={2.6} /> : null}
              {saved && !dirty ? t('account.profile.saved') : t('account.profile.saveName')}
            </Button>
          </div>
        )}
      </Field>
      <p role="status" aria-live="polite" className="sr-only">
        {saved ? t('account.profile.saved') : ''}
      </p>
    </form>
  );
}

function LanguageSelect({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { t, te, lang, setLang } = useI18n();
  const { setUser } = useStudioSession();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function onChange(next: Lang) {
    if (next === lang) return;
    const previous = lang;
    const request = ++requestRef.current;
    setLang(next); // instant UI switch (also writes the cookie)
    setStatus('saving');
    setError(null);
    try {
      const { user: updated } = await studioApi.updateAccount({ lang: next });
      if (request !== requestRef.current) return; // a newer change superseded this one
      setUser(updated);
      setStatus('saved');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus('idle'), SAVED_FLASH_MS);
    } catch (err) {
      if (request !== requestRef.current) return;
      const code = errorCode(err);
      if (code === 'unauthorized') {
        onUnauthorized();
        return;
      }
      // Keep the UI consistent with what is stored on the account.
      setLang(previous);
      setStatus('idle');
      setError(te(code));
    }
  }

  return (
    <div className="min-w-0">
      <Field label={t('common.language')} error={error} hint={t('account.profile.languageHint')}>
        {(id) => (
          <div className="relative">
            <select
              id={id}
              name="lang"
              value={lang}
              onChange={(e) => {
                if (isLang(e.target.value)) void onChange(e.target.value);
              }}
              aria-invalid={error ? true : undefined}
              className={cx(
                'h-12 w-full appearance-none rounded-xl border bg-studio-surface pl-4 pr-11 text-[15px] text-studio-text transition-colors focus:border-studio-orange/80 focus:outline-none focus:ring-2 focus:ring-studio-red/25',
                error ? 'border-studio-red/80' : 'border-studio-line',
              )}
            >
              {LANGS.map((code) => (
                <option key={code} value={code} className="bg-studio-elevated text-studio-text">
                  {code === 'en' ? t('common.lang.en') : t('common.lang.pt')}
                </option>
              ))}
            </select>
            <IconChevronDown
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-studio-subtle"
            />
          </div>
        )}
      </Field>
      <p
        role="status"
        aria-live="polite"
        className={cx(
          'mt-1.5 flex h-5 items-center gap-1.5 text-xs',
          status === 'saved' ? 'text-studio-success' : 'text-studio-subtle',
        )}
      >
        {status === 'saving' ? (
          <>
            <Spinner size={12} />
            {t('account.profile.languageSaving')}
          </>
        ) : status === 'saved' ? (
          <>
            <IconCheck size={14} strokeWidth={2.6} />
            {t('account.profile.languageSaved')}
          </>
        ) : null}
      </p>
    </div>
  );
}
