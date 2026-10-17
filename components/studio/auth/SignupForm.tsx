'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { generationsFor, type PlanId } from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Alert, Button, Checkbox, Field, Input, PasswordInput, Spinner } from '@/components/studio/ui';
import { IconFlame } from '@/components/studio/icons';
import { AuthLink, AuthShell } from './AuthShell';
import { PasswordStrength } from './PasswordStrength';
import { PlanNote } from './PlanNote';
import { DEFAULT_AFTER_AUTH, authHref } from './redirect';
import { useCompleteAuth } from './useCompleteAuth';
import { NAME_MAX, PASSWORD_MAX, PASSWORD_MIN, isValidEmail } from './validation';

type FieldName = 'name' | 'email' | 'password' | 'terms';
type FieldErrors = Partial<Record<FieldName, string>>;

export function SignupForm({ next, plan }: { next: string | null; plan: PlanId | null }) {
  const { t, te, lang } = useI18n();
  const router = useRouter();
  const { user, config } = useStudioSession();
  const completeAuth = useCompleteAuth({ next, plan });

  const [alreadyLoggedIn] = useState(() => user !== null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ code: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };
  const termsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alreadyLoggedIn) router.replace(next || DEFAULT_AFTER_AUTH);
  }, [alreadyLoggedIn, next, router]);

  function clearError(field: FieldName) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function focusField(field: FieldName) {
    if (field === 'terms') {
      termsRef.current?.querySelector('input')?.focus();
      termsRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
      refs[field].current?.focus();
    }
  }

  function validate(): FieldErrors {
    const found: FieldErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) found.name = t('auth.validation.nameRequired');
    else if (trimmedName.length > NAME_MAX) found.name = t('auth.validation.nameTooLong');
    if (!isValidEmail(email)) found.email = t('auth.validation.emailInvalid');
    if (password.length < PASSWORD_MIN) found.password = t('auth.validation.passwordShort');
    else if (password.length > PASSWORD_MAX) found.password = t('auth.validation.passwordTooLong');
    if (!accepted) found.terms = te('terms_required');
    return found;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    setFormError(null);
    const firstInvalid = (['name', 'email', 'password', 'terms'] as FieldName[]).find((f) => found[f]);
    if (firstInvalid) return focusField(firstInvalid);

    setSubmitting(true);
    try {
      const { user: created } = await studioApi.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        acceptTerms: true,
        lang,
      });
      await completeAuth(created);
    } catch (err) {
      setSubmitting(false);
      const code = err instanceof ApiError ? err.code : 'internal';
      const field = err instanceof ApiError ? err.details?.field : undefined;

      if (code === 'email_taken') {
        setFormError({ code, message: te(code) });
        return focusField('email');
      }
      if (code === 'weak_password') {
        setErrors({ password: te(code) });
        return focusField('password');
      }
      if (code === 'terms_required') {
        setErrors({ terms: te(code) });
        return focusField('terms');
      }
      if (code === 'invalid_input' && (field === 'name' || field === 'email' || field === 'password')) {
        const message =
          field === 'name'
            ? t(name.trim().length > NAME_MAX ? 'auth.validation.nameTooLong' : 'auth.validation.nameRequired')
            : field === 'email'
              ? t('auth.validation.emailInvalid')
              : t('auth.validation.passwordTooLong');
        setErrors({ [field]: message });
        return focusField(field);
      }
      setFormError({ code, message: te(code) });
    }
  }

  const bonus = config.signupBonus;
  const bonusImages = generationsFor(bonus, 'image');
  const bonusDetail =
    bonusImages === 1
      ? t('auth.signup.bonusOneImage')
      : bonusImages > 1
        ? t('auth.signup.bonusImages', { count: bonusImages })
        : t('auth.signup.bonusGeneric');

  const [termsBefore, termsAfter = ''] = t('auth.signup.terms').split('{terms}');

  const below = (
    <>
      {t('auth.signup.hasAccount')} <AuthLink href={authHref('/studio/login', { next, plan })}>{t('common.login')}</AuthLink>
    </>
  );

  return (
    <AuthShell title={t('auth.signup.title')} subtitle={t('auth.signup.subtitle')} below={alreadyLoggedIn ? undefined : below}>
      {alreadyLoggedIn ? (
        <div role="status" className="flex items-center justify-center gap-3 py-6 text-sm text-studio-muted">
          <Spinner className="text-studio-orange" />
          {t('auth.login.redirecting')}
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5" aria-busy={submitting || undefined}>
          {bonus > 0 ? (
            <div className="studio-gradient-border flex items-center gap-3 rounded-xl bg-studio-fire-soft px-4 py-3">
              <span className="studio-gradient-bg studio-glow-sm flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white">
                <IconFlame size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-studio-text">{t('auth.signup.bonusTitle', { count: bonus })}</p>
                <p className="text-xs text-studio-muted">{bonusDetail}</p>
              </div>
            </div>
          ) : null}

          {plan ? <PlanNote planId={plan} context="signup" /> : null}

          {formError ? (
            <Alert>
              <p>{formError.message}</p>
              {formError.code === 'email_taken' ? (
                <Link
                  href={authHref('/studio/login', { next, plan })}
                  className="mt-1 inline-block rounded font-semibold text-white underline underline-offset-4"
                >
                  {t('auth.signup.emailTakenAction')}
                </Link>
              ) : null}
            </Alert>
          ) : null}

          <Field label={t('auth.fields.name')} error={errors.name}>
            {(id) => (
              <Input
                ref={refs.name}
                id={id}
                name="name"
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                maxLength={NAME_MAX}
                placeholder={t('auth.fields.namePlaceholder')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError('name');
                }}
                invalid={!!errors.name}
                required
              />
            )}
          </Field>

          <Field label={t('auth.fields.email')} error={errors.email}>
            {(id) => (
              <Input
                ref={refs.email}
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
                  clearError('email');
                  if (formError?.code === 'email_taken') setFormError(null);
                }}
                invalid={!!errors.email || formError?.code === 'email_taken'}
                required
              />
            )}
          </Field>

          <Field label={t('auth.fields.password')} hint={t('auth.fields.passwordHint')} error={errors.password}>
            {(id) => (
              <div className="space-y-2.5">
                <PasswordInput
                  ref={refs.password}
                  id={id}
                  name="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  placeholder={t('auth.fields.newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError('password');
                  }}
                  invalid={!!errors.password}
                  required
                />
                <PasswordStrength password={password} />
              </div>
            )}
          </Field>

          <div ref={termsRef} className="space-y-1.5">
            <Checkbox
              checked={accepted}
              onChange={(v) => {
                setAccepted(v);
                clearError('terms');
              }}
            >
              {termsBefore}
              <Link
                href="/studio/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-medium text-studio-orange underline-offset-4 hover:underline"
              >
                {t('auth.signup.termsLink')}
                <span className="sr-only"> {t('auth.signup.newTab')}</span>
              </Link>
              {termsAfter}
            </Checkbox>
            {errors.terms ? (
              <p className="pl-8 text-sm text-studio-red" role="alert">
                {errors.terms}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {t('auth.signup.submit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
