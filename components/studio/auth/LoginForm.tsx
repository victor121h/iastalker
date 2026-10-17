'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import type { PlanId } from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Alert, Button, Field, Input, PasswordInput, Spinner } from '@/components/studio/ui';
import { AuthLink, AuthShell } from './AuthShell';
import { PlanNote } from './PlanNote';
import { DEFAULT_AFTER_AUTH, authHref } from './redirect';
import { useCompleteAuth } from './useCompleteAuth';
import { isValidEmail } from './validation';

type FieldErrors = { email?: string; password?: string };

export function LoginForm({ next, plan }: { next: string | null; plan: PlanId | null }) {
  const { t, te } = useI18n();
  const router = useRouter();
  const { user } = useStudioSession();
  const completeAuth = useCompleteAuth({ next, plan });

  // Only a session that existed when the page opened triggers the bounce; a fresh login navigates itself.
  const [alreadyLoggedIn] = useState(() => user !== null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (alreadyLoggedIn) router.replace(next || DEFAULT_AFTER_AUTH);
  }, [alreadyLoggedIn, next, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const found: FieldErrors = {};
    if (!isValidEmail(email)) found.email = t('auth.validation.emailInvalid');
    if (!password) found.password = t('auth.validation.passwordRequired');
    setErrors(found);
    setFormError(null);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      const { user: loggedIn } = await studioApi.login({ email: email.trim(), password });
      await completeAuth(loggedIn); // keeps the button busy while we navigate away
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'internal';
      setSubmitting(false);
      if (code === 'invalid_input' && err instanceof ApiError && err.details?.field === 'email') {
        setErrors({ email: t('auth.validation.emailInvalid') });
        emailRef.current?.focus();
        return;
      }
      setFormError(te(code));
      if (code === 'invalid_credentials') passwordRef.current?.select();
    }
  }

  const below = (
    <>
      {t('auth.login.noAccount')} <AuthLink href={authHref('/studio/signup', { next, plan })}>{t('auth.login.createAccount')}</AuthLink>
    </>
  );

  return (
    <AuthShell title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} below={alreadyLoggedIn ? undefined : below}>
      {alreadyLoggedIn ? (
        <div role="status" className="flex items-center justify-center gap-3 py-6 text-sm text-studio-muted">
          <Spinner className="text-studio-orange" />
          {t('auth.login.redirecting')}
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5" aria-busy={submitting || undefined}>
          {plan ? <PlanNote planId={plan} context="login" /> : null}
          {formError ? <Alert>{formError}</Alert> : null}

          <Field label={t('auth.fields.email')} error={errors.email}>
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
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                invalid={!!errors.email}
                required
              />
            )}
          </Field>

          <div>
            <Field label={t('auth.fields.password')} error={errors.password}>
              {(id) => (
                <PasswordInput
                  ref={passwordRef}
                  id={id}
                  name="password"
                  autoComplete="current-password"
                  placeholder={t('auth.fields.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  invalid={!!errors.password}
                  required
                />
              )}
            </Field>
            <div className="mt-2.5 flex justify-end">
              <Link
                href="/studio/forgot-password"
                className="rounded text-sm font-medium text-studio-muted transition-colors hover:text-studio-orange"
              >
                {t('auth.login.forgot')}
              </Link>
            </div>
          </div>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {t('auth.login.submit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
