'use client';

// Security: change password (current + new + confirmation). Other sessions are signed out by the
// API; this browser stays logged in.
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import { Alert, Button, Field, PasswordInput } from '@/components/studio/ui';
import { IconShield } from '@/components/studio/icons';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './constants';
import { AccountSection } from './Section';

type FieldName = 'current' | 'next' | 'confirm';
type FieldErrors = Partial<Record<FieldName, string>>;

export function SecuritySection({ email, onUnauthorized }: { email: string; onUnauthorized: () => void }) {
  const { t, te } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const refs = {
    current: useRef<HTMLInputElement>(null),
    next: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  };

  function validate(): FieldErrors {
    const found: FieldErrors = {};
    if (!current) found.current = t('account.security.errors.currentRequired');
    if (next.length < PASSWORD_MIN_LENGTH) {
      found.next = t('account.security.errors.tooShort', { min: PASSWORD_MIN_LENGTH });
    } else if (next.length > PASSWORD_MAX_LENGTH) {
      found.next = t('account.security.errors.tooLong', { max: PASSWORD_MAX_LENGTH });
    } else if (current && next === current) {
      found.next = t('account.security.errors.same');
    }
    if (!found.next && confirm !== next) found.confirm = t('account.security.errors.mismatch');
    return found;
  }

  function focusFirst(found: FieldErrors) {
    const order: FieldName[] = ['current', 'next', 'confirm'];
    const first = order.find((name) => found[name]);
    if (first) refs[first].current?.focus();
  }

  function clearFieldError(name: FieldName) {
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (formError) setFormError(null);
    if (success) setSuccess(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const found = validate();
    setErrors(found);
    setFormError(null);
    setSuccess(false);
    if (Object.keys(found).some((k) => found[k as FieldName])) {
      focusFirst(found);
      return;
    }

    setSubmitting(true);
    try {
      await studioApi.changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setErrors({});
      setSuccess(true);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'internal';
      if (code === 'unauthorized') {
        onUnauthorized();
        return;
      }
      if (code === 'invalid_credentials') {
        const found = { current: t('account.security.errors.wrongCurrent') };
        setErrors(found);
        focusFirst(found);
      } else if (code === 'weak_password') {
        const found = { next: te(code) };
        setErrors(found);
        focusFirst(found);
      } else {
        setFormError(te(code));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountSection
      id="security"
      icon={<IconShield size={20} />}
      title={t('account.security.title')}
      subtitle={t('account.security.subtitle')}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {/* Lets password managers associate the new password with the account. */}
        <input type="email" name="username" autoComplete="username" hidden readOnly value={email} />

        <div className="md:max-w-[calc(50%-0.75rem)]">
          <Field label={t('account.security.current')} error={errors.current}>
            {(id) => (
              <PasswordInput
                ref={refs.current}
                id={id}
                name="current-password"
                autoComplete="current-password"
                value={current}
                invalid={!!errors.current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  clearFieldError('current');
                }}
              />
            )}
          </Field>
          <p className="mt-1.5 text-xs">
            <Link
              href="/studio/forgot-password"
              className="rounded text-studio-orange underline-offset-2 hover:underline"
            >
              {t('account.security.forgot')}
            </Link>
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <Field
            label={t('account.security.new')}
            error={errors.next}
            hint={t('account.security.newHint', { min: PASSWORD_MIN_LENGTH })}
          >
            {(id) => (
              <PasswordInput
                ref={refs.next}
                id={id}
                name="new-password"
                autoComplete="new-password"
                value={next}
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                invalid={!!errors.next}
                onChange={(e) => {
                  setNext(e.target.value);
                  clearFieldError('next');
                }}
              />
            )}
          </Field>
          <Field label={t('account.security.confirm')} error={errors.confirm}>
            {(id) => (
              <PasswordInput
                ref={refs.confirm}
                id={id}
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                maxLength={PASSWORD_MAX_LENGTH}
                invalid={!!errors.confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clearFieldError('confirm');
                }}
              />
            )}
          </Field>
        </div>

        {formError ? <Alert variant="error">{formError}</Alert> : null}
        {success ? <Alert variant="success">{t('account.security.success')}</Alert> : null}

        <div className="flex justify-end">
          <Button type="submit" loading={submitting} className="w-full sm:w-auto">
            {submitting ? null : <IconShield size={18} />}
            {t('account.security.submit')}
          </Button>
        </div>
      </form>
    </AccountSection>
  );
}
