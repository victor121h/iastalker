'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import { Alert, Button, ButtonLink, Field, Input } from '@/components/studio/ui';
import { IconArrowRight, IconMail } from '@/components/studio/icons';
import { AuthEmblem, AuthLink, AuthShell } from './AuthShell';
import { isValidEmail } from './validation';

export function ForgotPasswordForm() {
  const { t, te, lang } = useI18n();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sentTo) sentRef.current?.focus();
  }, [sentTo]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    if (!isValidEmail(email)) {
      setFieldError(t('auth.validation.emailInvalid'));
      emailRef.current?.focus();
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      const trimmed = email.trim();
      await studioApi.forgotPassword({ email: trimmed, lang });
      setSentTo(trimmed);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'internal';
      if (code === 'invalid_input') {
        setFieldError(t('auth.validation.emailInvalid'));
        emailRef.current?.focus();
      } else {
        setFormError(te(code));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const below = (
    <>
      {t('auth.forgot.remembered')} <AuthLink href="/studio/login">{t('auth.forgot.backToLogin')}</AuthLink>
    </>
  );

  if (sentTo) {
    const [before, after = ''] = t('auth.forgot.sentBody').split('{email}');
    return (
      <AuthShell
        title={t('auth.forgot.sentTitle')}
        icon={
          <AuthEmblem>
            <IconMail size={26} />
          </AuthEmblem>
        }
      >
        <div ref={sentRef} tabIndex={-1} role="status" className="space-y-3 outline-none">
          <p className="text-[15px] leading-relaxed text-studio-muted">
            {before}
            <strong className="break-all font-semibold text-studio-text">{sentTo}</strong>
            {after}
          </p>
          <p className="text-sm text-studio-subtle">{t('auth.forgot.spamHint')}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          <ButtonLink href="/studio/login" size="lg" fullWidth>
            {t('auth.forgot.backToLogin')}
            <IconArrowRight size={18} />
          </ButtonLink>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setSentTo(null);
              setEmail('');
              setTimeout(() => emailRef.current?.focus(), 0);
            }}
          >
            {t('auth.forgot.tryAgain')}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} below={below}>
      <form onSubmit={onSubmit} noValidate className="space-y-5" aria-busy={submitting || undefined}>
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label={t('auth.fields.email')} error={fieldError}>
          {(id) => (
            <Input
              ref={emailRef}
              id={id}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('auth.fields.emailPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              invalid={!!fieldError}
              required
            />
          )}
        </Field>
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {t('auth.forgot.submit')}
        </Button>
      </form>
    </AuthShell>
  );
}
