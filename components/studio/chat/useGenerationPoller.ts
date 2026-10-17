'use client';

// Polls every pending generation with studioApi.getGeneration until it reaches a final state:
// ~2.5 s for images, ~5 s for videos, exponential backoff on errors, slower while the tab is
// hidden (and an immediate check when it becomes visible again). Stops on unmount.
import { useEffect, useRef } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import type { GenerationType } from '@/lib/studio/plans';
import type { GenerationDTO } from '@/lib/studio/types';
import { needsPolling } from './types';

const BASE_INTERVAL_MS: Record<GenerationType, number> = { image: 2500, video: 5000 };
const MAX_BACKOFF_MS = 30_000;
const HIDDEN_FACTOR = 3;
/** A failed generation is re-checked a few times so the server can confirm the refund. */
const MAX_REFUND_CHECKS = 4;

export interface PollTarget {
  id: string;
  type: GenerationType;
}

export interface PollerHandlers {
  onUpdate: (generation: GenerationDTO, balance: number) => void;
  /** The generation no longer exists (its conversation was deleted). */
  onGone: (id: string) => void;
  onUnauthorized: () => void;
}

interface PollerEntry {
  id: string;
  type: GenerationType;
  timer: number | null;
  inFlight: boolean;
  failures: number;
  refundChecks: number;
  stopped: boolean;
}

export function useGenerationPoller(targets: PollTarget[], handlers: PollerHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const entriesRef = useRef(new Map<string, PollerEntry>());
  const aliveRef = useRef(true);

  const targetsKey = targets
    .map((t) => `${t.id}:${t.type}`)
    .sort()
    .join('|');
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  useEffect(() => {
    aliveRef.current = true;
    const entries = entriesRef.current;

    const stopEntry = (entry: PollerEntry) => {
      entry.stopped = true;
      if (entry.timer !== null) window.clearTimeout(entry.timer);
      entry.timer = null;
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      entries.forEach((entry) => {
        if (entry.stopped || entry.inFlight || entry.timer === null) return;
        window.clearTimeout(entry.timer);
        entry.timer = null;
        void tick(entry);
      });
    };

    const schedule = (entry: PollerEntry, delay: number) => {
      if (entry.stopped || !aliveRef.current) return;
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      entry.timer = window.setTimeout(() => {
        entry.timer = null;
        void tick(entry);
      }, hidden ? delay * HIDDEN_FACTOR : delay);
    };

    const tick = async (entry: PollerEntry) => {
      if (entry.stopped || !aliveRef.current) return;
      entry.inFlight = true;
      try {
        const { generation, balance } = await studioApi.getGeneration(entry.id);
        entry.inFlight = false;
        if (entry.stopped || !aliveRef.current) return;
        entry.failures = 0;
        handlersRef.current.onUpdate(generation, balance);
        if (!needsPolling(generation)) {
          stopEntry(entry);
          return;
        }
        if (generation.status === 'failed') {
          entry.refundChecks += 1;
          if (entry.refundChecks >= MAX_REFUND_CHECKS) {
            stopEntry(entry);
            return;
          }
        }
        schedule(entry, BASE_INTERVAL_MS[entry.type]);
      } catch (err) {
        entry.inFlight = false;
        if (entry.stopped || !aliveRef.current) return;
        if (err instanceof ApiError && err.status === 404) {
          stopEntry(entry);
          handlersRef.current.onGone(entry.id);
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          entries.forEach(stopEntry);
          handlersRef.current.onUnauthorized();
          return;
        }
        entry.failures += 1;
        const backoff = Math.min(BASE_INTERVAL_MS[entry.type] * Math.pow(2, entry.failures), MAX_BACKOFF_MS);
        schedule(entry, backoff);
      }
    };

    // Sync the running pollers with the wanted set.
    const wanted = new Map<string, PollTarget>();
    targetsRef.current.forEach((t) => wanted.set(t.id, t));
    entries.forEach((entry, id) => {
      if (!wanted.has(id)) {
        stopEntry(entry);
        entries.delete(id);
      }
    });
    wanted.forEach((target, id) => {
      if (entries.has(id)) return;
      const entry: PollerEntry = {
        id,
        type: target.type,
        timer: null,
        inFlight: false,
        failures: 0,
        refundChecks: 0,
        stopped: false,
      };
      entries.set(id, entry);
      schedule(entry, BASE_INTERVAL_MS[target.type]);
    });

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [targetsKey]);

  // Stop everything on unmount.
  useEffect(() => {
    const entries = entriesRef.current;
    return () => {
      aliveRef.current = false;
      entries.forEach((entry) => {
        entry.stopped = true;
        if (entry.timer !== null) window.clearTimeout(entry.timer);
        entry.timer = null;
      });
      entries.clear();
    };
  }, []);
}
