'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import { Alert, Button, ButtonLink, Field, PasswordInput, Spinner } from '@/components/studio/ui';
import { IconAlert, IconLock } from '@/components/studio/icons';
import { AuthEmblem, AuthLink, AuthShell } from './AuthShell';
import { PasswordStrength } from './PasswordStrength';
import { useCompleteAuth } from './useCompleteAuth';
import { PASSWORD_MAX, PASSWORD_MIN, looksLikeResetToken } from './validation';

type Status = 'form' | 'expired' | 'done';
type FieldErrors = { password?: string; confirm?: string };

export function ResetPasswordForm({ token }: { token: string | null }) {
  const { t } = useI18n();
  if (!looksLikeResetToken(token)) {
    return (
      <LinkProblem
        title={t('auth.reset.missingTitle')}
        body={t('auth.reset.missingBody')}
      />
    );
  }
  return <ResetForm token={token} />;
}

function LinkProblem({ title, body }: { title: string; body: string }) {
  const { t } = useI18n();
  return (
    <AuthShell
      title={title}
      icon={
        <AuthEmblem tone="muted">
          <IconAlert size={26} />
        </AuthEmblem>
      }
      below={<AuthLink href="/studio/login">{t('auth.forgot.backToLogin')}</AuthLink>}
    >
      <p role="alert" className="text-[15px] leading-relaxed text-studio-muted">
        {body}
      </p>
      <ButtonLink href="/studio/forgot-password" size="lg" fullWidth className="mt-6">
        {t('auth.reset.requestNew')}
      </ButtonLink>
    </AuthShell>
  );
}

function ResetForm({ token }: { token: string }) {
  const { t, te } = useI18n();
  const completeAuth = useCompleteAuth({ next: null, plan: null });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('form');
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || status !== 'form') return;

    const found: FieldErrors = {};
    if (password.length < PASSWORD_MIN) found.password = t('auth.validation.passwordShort');
    else if (password.length > PASSWORD_MAX) found.password = t('auth.validation.passwordTooLong');
    if (!found.password && confirm !== password) found.confirm = t('auth.validation.passwordMismatch');
    setErrors(found);
    setFormError(null);
    if (found.password) return passwordRef.current?.focus();
    if (found.confirm) return confirmRef.current?.focus();

    setSubmitting(true);
    try {
      const { user } = await studioApi.resetPassword({ token, password });
      setStatus('done');
      await completeAuth(user);
    } catch (err) {
      setSubmitting(false);
      const code = err instanceof ApiError ? err.code : 'internal';
      if (code === 'invalid_token') {
        setStatus('expired');
        return;
      }
      if (code === 'weak_password') {
        setErrors({ password: te(code) });
        passwordRef.current?.focus();
        return;
      }
      setFormError(te(code));
    }
  }

  if (status === 'expired') {
    return <LinkProblem title={t('auth.reset.expiredTitle')} body={t('auth.reset.expiredBody')} />;
  }

  return (
    <AuthShell
      title={t('auth.reset.title')}
      subtitle={t('auth.reset.subtitle')}
      icon={
        <AuthEmblem>
          <IconLock size={24} />
        </AuthEmblem>
      }
      below={status === 'done' ? undefined : <AuthLink href="/studio/login">{t('auth.forgot.backToLogin')}</AuthLink>}
    >
      {status === 'done' ? (
        <Alert variant="success">
          <span className="inline-flex items-center gap-2">
            {t('auth.reset.success')}
            <Spinner size={14} />
          </span>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5" aria-busy={submitting || undefined}>
          {formError ? <Alert>{formError}</Alert> : null}

          <Field label={t('auth.fields.newPassword')} hint={t('auth.fields.passwordHint')} error={errors.password}>
            {(id) => (
              <div className="space-y-2.5">
                <PasswordInput
                  ref={passwordRef}
                  id={id}
                  name="new-password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  placeholder={t('auth.fields.newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  invalid={!!errors.password}
                  required
                />
                <PasswordStrength password={password} />
              </div>
            )}
          </Field>

          <Field label={t('auth.fields.confirmPassword')} error={errors.confirm}>
            {(id) => (
              <PasswordInput
                ref={confirmRef}
                id={id}
                name="confirm-password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
                placeholder={t('auth.fields.confirmPasswordPlaceholder')}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                }}
                invalid={!!errors.confirm}
                required
              />
            )}
          </Field>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {t('auth.reset.submit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
