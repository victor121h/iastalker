'use client';

// Session ("danger zone light"): log out of this device, and how to request account deletion.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import { SUPPORT_EMAIL } from '@/lib/studio/plans';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Alert, Button, buttonClasses } from '@/components/studio/ui';
import { IconLogout, IconMail, IconTrash } from '@/components/studio/icons';
import { AccountSection } from './Section';

export function SessionSection({ email }: { email: string }) {
  const { t, te } = useI18n();
  const { setUser } = useStudioSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await studioApi.logout();
    } catch (err) {
      setPending(false);
      setError(te(err instanceof ApiError ? err.code : 'internal'));
      return;
    }
    setUser(null);
    router.replace('/studio');
    router.refresh();
  }

  const deleteHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('account.session.deleteSubject'))}`;

  return (
    <AccountSection
      id="session"
      icon={<IconLogout size={20} />}
      title={t('account.session.title')}
      subtitle={t('account.session.subtitle', { email })}
      bodyClassName="divide-y divide-studio-line/70 !py-0"
    >
      <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-studio-text">{t('account.session.logoutTitle')}</p>
          <p className="mt-0.5 text-sm text-studio-muted">{t('account.session.logoutBody')}</p>
        </div>
        <Button variant="secondary" onClick={logout} loading={pending} className="w-full flex-none sm:w-auto">
          {pending ? null : <IconLogout size={18} />}
          {pending ? t('account.session.loggingOut') : t('common.logout')}
        </Button>
      </div>
      {error ? (
        <div className="py-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-medium text-studio-text">
            <IconTrash size={16} className="flex-none text-studio-subtle" />
            {t('account.session.deleteTitle')}
          </p>
          <p className="mt-0.5 text-sm text-studio-muted">{t('account.session.deleteBody')}</p>
        </div>
        <a
          href={deleteHref}
          className={buttonClasses({
            variant: 'ghost',
            className: 'w-full flex-none border border-studio-line hover:border-studio-red/50 sm:w-auto',
          })}
        >
          <IconMail size={18} />
          {t('account.session.deleteCta')}
        </a>
      </div>
    </AccountSection>
  );
}
