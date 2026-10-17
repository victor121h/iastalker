'use client';

// Fullscreen preview of a generated image, with download and the "animate into video" upsell.
import { useEffect, useId, useRef } from 'react';
import type { GenerationDTO } from '@/lib/studio/types';
import { useI18n } from '@/lib/studio/i18n/client';
import { Modal } from '@/components/studio/ui';
import { AnimateButton, DownloadLink } from './GenerationItem';

export function Lightbox({
  generation,
  onClose,
  onAnimate,
}: {
  generation: GenerationDTO | null;
  onClose: () => void;
  onAnimate: (g: GenerationDTO) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const g = generation;
  const open = Boolean(g && g.resultUrl);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} size="xl" labelledBy={titleId} className="!bg-[#070304]">
      {g && g.resultUrl && (
        <div className="flex flex-col">
          <h2 ref={headingRef} id={titleId} tabIndex={-1} className="sr-only">
            {t('chat.lightbox.title')}
          </h2>
          <div className="flex items-center justify-center bg-black/60 px-2 pb-2 pt-12 sm:px-6 sm:pt-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.resultUrl}
              alt={t('chat.result.imageAlt', { prompt: g.prompt })}
              className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-studio-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="line-clamp-2 min-w-0 text-sm text-studio-muted">{g.prompt}</p>
            <div className="flex flex-none flex-wrap items-center gap-2">
              <DownloadLink generation={g} />
              {g.type === 'image' && (
                <AnimateButton
                  onClick={() => {
                    onClose();
                    onAnimate(g);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
