'use client';

// Sidebar content (desktop column and mobile drawer): logo, "New creation", the conversation
// list, then credits (pill + Buy credits) and the account menu.
import type { Ref } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Button, CreditPill, Logo } from '@/components/studio/ui';
import { IconClose, IconFlame, IconPlus } from '@/components/studio/icons';
import { ConversationList, type ConversationListProps } from './ConversationList';
import { UserMenu } from './UserMenu';

export interface SidebarProps extends ConversationListProps {
  onNew: () => void;
  onOpenPaywall: () => void;
  /** Mobile drawer only: close button. */
  onClose?: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
}

export function Sidebar({ onNew, onOpenPaywall, onClose, closeButtonRef, ...listProps }: SidebarProps) {
  const { t } = useI18n();
  const { user } = useStudioSession();
  const credits = user?.credits ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 flex-none items-center justify-between gap-2 px-4">
        <Logo href="/studio" size={30} />
        {onClose && (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('chat.sidebar.close')}
            className="rounded-full p-2 text-studio-subtle hover:bg-white/5 hover:text-studio-text"
          >
            <IconClose size={20} />
          </button>
        )}
      </div>

      <div className="flex-none px-3 pb-3">
        <Button variant="secondary" fullWidth onClick={onNew} className="!justify-start rounded-2xl !px-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg studio-gradient-bg text-white">
            <IconPlus size={15} strokeWidth={2.4} />
          </span>
          {t('chat.sidebar.newCreation')}
        </Button>
      </div>

      <nav aria-label={t('chat.sidebar.nav')} className="flex min-h-0 flex-1 flex-col">
        <h2 className="flex-none px-5 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-studio-subtle">
          {t('chat.sidebar.history')}
        </h2>
        <div className="studio-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <ConversationList {...listProps} />
        </div>
      </nav>

      <div className="flex-none space-y-3 border-t border-studio-line p-3">
        <div className="rounded-2xl border border-studio-line bg-studio-bg/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-studio-subtle">{t('chat.sidebar.balance')}</span>
            <CreditPill credits={credits} onClick={onOpenPaywall} className="!h-8" />
          </div>
          <Button size="sm" fullWidth onClick={onOpenPaywall} className="mt-2.5 h-10">
            <IconFlame size={16} />
            {t('common.buyCredits')}
          </Button>
        </div>
        <UserMenu onNavigate={onClose} />
      </div>
    </div>
  );
}
