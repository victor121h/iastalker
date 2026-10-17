'use client';

// Top bar of the chat area: menu button (mobile), conversation title, and on mobile a
// "new creation" shortcut plus the credit pill.
import type { Ref } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import { CreditPill } from '@/components/studio/ui';
import { IconMenu, IconPlus } from '@/components/studio/icons';

export function ChatHeader({
  title,
  titleLoading,
  credits,
  drawerOpen,
  drawerId,
  menuButtonRef,
  onOpenDrawer,
  onNew,
  onOpenPaywall,
}: {
  title: string;
  titleLoading: boolean;
  credits: number;
  drawerOpen: boolean;
  drawerId: string;
  menuButtonRef: Ref<HTMLButtonElement>;
  onOpenDrawer: () => void;
  onNew: () => void;
  onOpenPaywall: () => void;
}) {
  const { t } = useI18n();
  return (
    <header className="relative z-20 flex h-14 flex-none items-center gap-1.5 border-b border-studio-line/70 bg-studio-bg/70 px-2 backdrop-blur-xl sm:px-4 lg:h-16 lg:px-8">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onOpenDrawer}
        aria-label={t('chat.sidebar.open')}
        aria-expanded={drawerOpen}
        aria-controls={drawerId}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-studio-muted hover:bg-white/5 hover:text-studio-text lg:hidden"
      >
        <IconMenu size={21} />
      </button>
      <div className="min-w-0 flex-1 px-1">
        {titleLoading ? (
          <span className="block h-4 w-40 max-w-full rounded studio-shimmer" aria-hidden="true" />
        ) : (
          <h1 className="truncate font-display text-[15px] font-semibold text-studio-text sm:text-base">{title}</h1>
        )}
      </div>
      <button
        type="button"
        onClick={onNew}
        aria-label={t('chat.sidebar.newCreation')}
        title={t('chat.sidebar.newCreation')}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-studio-muted hover:bg-white/5 hover:text-studio-text lg:hidden"
      >
        <IconPlus size={20} />
      </button>
      <CreditPill credits={credits} onClick={onOpenPaywall} className="!h-8 flex-none !px-2.5 lg:hidden" />
    </header>
  );
}
