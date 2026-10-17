'use client';

// The Studio chat: sidebar with the user's conversations, the conversation (one exchange per
// generation), the composer, polling of pending generations, credits/paywall UX, reference
// images (picker, drag & drop, paste) and URL sync without remounting.
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { BRAND_NAME, GENERATION_COST, type AspectRatio, type GenerationType } from '@/lib/studio/plans';
import type { ConversationDTO, GenerationDTO } from '@/lib/studio/types';
import { useI18n } from '@/lib/studio/i18n/client';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Spinner } from '@/components/studio/ui';
import { IconPaperclip } from '@/components/studio/icons';
import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { DeleteModal, RenameModal } from './ConversationList';
import { EmptyState } from './EmptyState';
import type { GenerationActions } from './GenerationItem';
import { Lightbox } from './Lightbox';
import { MessageList } from './MessageList';
import { PaywallModal } from './PaywallModal';
import {
  ReferenceImageError,
  isAcceptedReference,
  pickImageFile,
  prepareReference,
  referenceFromUrl,
  type ReferenceProblem,
} from './reference';
import { Sidebar } from './Sidebar';
import { ToastProvider, useToast } from './Toast';
import {
  isPendingStatus,
  needsPolling,
  newerGeneration,
  type ChatItem,
  type ComposerReference,
  type GenerationRequest,
} from './types';
import { useGenerationPoller, type PollTarget } from './useGenerationPoller';
import { chatPath, conversationIdFromPath, isValidConversationId, tempId } from './utils';

export function ChatApp({ initialConversationId }: { initialConversationId?: string | null }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ChatAppInner initialConversationId={initialConversationId ?? null} />
      </ToastProvider>
    </MotionConfig>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────

type SubmitResult = 'ok' | 'paywall' | 'error' | 'reference_rejected';
type HistoryMode = 'push' | 'replace' | 'none';

/** Stable function identity that always calls the latest closure. */
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

function referenceProblemOf(err: unknown): ReferenceProblem {
  if (err instanceof ReferenceImageError) return err.reason;
  const reason = (err as { reason?: unknown } | null)?.reason;
  return reason === 'unsupported' || reason === 'too_large' ? reason : 'unreadable';
}

function hasFiles(e: DragEvent | globalThis.DragEvent): boolean {
  const types = e.dataTransfer?.types;
  return types ? Array.from(types).indexOf('Files') !== -1 : false;
}

/** Replaces the optimistic item by the real one (or drops it when the server deduplicated). */
function swapOptimistic(list: ChatItem[], key: string, real: ChatItem): ChatItem[] {
  if (list.some((i) => !i.optimistic && i.generation.id === real.generation.id)) {
    return list.filter((i) => i.key !== key);
  }
  const idx = list.findIndex((i) => i.key === key);
  if (idx === -1) return list.concat(real);
  const next = list.slice();
  next[idx] = real;
  return next;
}

/** Merges a freshly loaded conversation with what we already show (keeps keys, newer statuses, in-flight items). */
function mergeLoaded(existing: ChatItem[] | undefined, loaded: GenerationDTO[]): ChatItem[] {
  const known = new Map<string, ChatItem>();
  (existing || []).forEach((item) => {
    if (!item.optimistic) known.set(item.generation.id, item);
  });
  const loadedIds = new Set<string>();
  const next: ChatItem[] = loaded.map((g) => {
    loadedIds.add(g.id);
    const prev = known.get(g.id);
    if (!prev) return { key: g.id, generation: g };
    const merged = newerGeneration(prev.generation, g);
    return merged === prev.generation ? prev : { ...prev, generation: merged };
  });
  (existing || []).forEach((item) => {
    // Created during this visit but not in the (possibly older) response, or still in flight.
    if (item.optimistic || (item.fresh && !loadedIds.has(item.generation.id))) next.push(item);
  });
  return next;
}

// ── component ────────────────────────────────────────────────────────────────────────────────

function ChatAppInner({ initialConversationId }: { initialConversationId: string | null }) {
  const { t, te } = useI18n();
  const { user, setUser, setCredits, refreshUser } = useStudioSession();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const drawerId = useId();

  // Sidebar
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');

  // Current view
  const [activeId, setActiveId] = useState<string | null>(initialConversationId);
  const activeIdRef = useRef<string | null>(initialConversationId);
  const [viewKey, setViewKey] = useState(0);
  const viewNonceRef = useRef(0);
  const [threads, setThreads] = useState<Record<string, ChatItem[]>>({});
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  /** Items of the not-yet-created conversation (only in-flight optimistic ones). */
  const [draft, setDraft] = useState<{ nonce: number; items: ChatItem[] }>({ nonce: 0, items: [] });
  // Start in the loading state for /studio/chat/<id> so the first (server) render shows the
  // skeleton instead of flashing the empty state.
  const [loadingId, setLoadingId] = useState<string | null>(() =>
    initialConversationId && isValidConversationId(initialConversationId) ? initialConversationId : null,
  );
  const [loadErrorId, setLoadErrorId] = useState<string | null>(null);

  // Composer
  const [mode, setMode] = useState<GenerationType>('image');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [prompt, setPrompt] = useState('');
  const [reference, setReference] = useState<ComposerReference | null>(null);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const referenceTokenRef = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [composerHeight, setComposerHeight] = useState(150);

  // Overlays
  const [paywall, setPaywall] = useState<{ open: boolean; missing: number | null; type: GenerationType | null; openedWith: number }>(
    { open: false, missing: null, type: null, openedWith: 0 },
  );
  const [lightbox, setLightbox] = useState<GenerationDTO | null>(null);
  const [renaming, setRenaming] = useState<ConversationDTO | null>(null);
  const [deleting, setDeleting] = useState<ConversationDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const credits = user?.credits ?? 0;
  const anyModalOpen = paywall.open || lightbox !== null || renaming !== null || deleting !== null;

  // ── Session ────────────────────────────────────────────────────────────────────────────────
  const handleUnauthorized = useStableCallback(() => {
    setUser(null);
    const path = typeof window !== 'undefined' ? window.location.pathname : '/studio/chat';
    const next = path.startsWith('/studio') && !path.startsWith('//') ? path : '/studio/chat';
    router.replace(`/studio/login?next=${encodeURIComponent(next)}`);
  });

  // ── Conversations list ─────────────────────────────────────────────────────────────────────
  const listReqRef = useRef(0);
  const refreshConversations = useStableCallback(async () => {
    const req = ++listReqRef.current;
    try {
      const res = await studioApi.listConversations();
      if (req !== listReqRef.current) return;
      setConversations(res.conversations);
      setListState('ready');
    } catch (err) {
      if (req !== listReqRef.current) return;
      if (isUnauthorized(err)) return handleUnauthorized();
      setListState((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  });

  const listTimerRef = useRef<number | null>(null);
  const scheduleListRefresh = useStableCallback(() => {
    if (listTimerRef.current !== null) window.clearTimeout(listTimerRef.current);
    listTimerRef.current = window.setTimeout(() => {
      listTimerRef.current = null;
      void refreshConversations();
    }, 500);
  });

  const upsertConversation = useStableCallback((c: ConversationDTO, toTop: boolean) => {
    setConversations((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (toTop || idx === -1) return [c].concat(prev.filter((x) => x.id !== c.id));
      const next = prev.slice();
      next[idx] = c;
      return next;
    });
  });

  const forgetConversation = useStableCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setThreads((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  });

  // ── Views / navigation ─────────────────────────────────────────────────────────────────────
  const focusComposer = useStableCallback(() => {
    window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* not focusable yet */
      }
    });
  });

  const loadSeqRef = useRef(0);
  const loadConversation = useStableCallback(async (id: string) => {
    const seq = ++loadSeqRef.current;
    setLoadErrorId(null);
    if (!threadsRef.current[id]) setLoadingId(id);
    try {
      const res = await studioApi.getConversation(id);
      setThreads((prev) => ({ ...prev, [id]: mergeLoaded(prev[id], res.generations) }));
      upsertConversation(res.conversation, false);
    } catch (err) {
      if (isUnauthorized(err)) return handleUnauthorized();
      if (err instanceof ApiError && err.status === 404) {
        forgetConversation(id);
        if (activeIdRef.current === id) {
          toast.show(t('chat.toast.conversationNotFound'), { variant: 'error' });
          goToView(null, 'replace');
        }
        return;
      }
      if (activeIdRef.current === id && !threadsRef.current[id]) setLoadErrorId(id);
      else if (activeIdRef.current === id) toast.show(te(err instanceof ApiError ? err.code : 'internal'), { variant: 'error' });
    } finally {
      if (seq === loadSeqRef.current) setLoadingId(null);
    }
  });

  const goToView = useStableCallback((id: string | null, history: HistoryMode) => {
    setDrawerOpen(false);
    if (id === activeIdRef.current) {
      if (id === null) focusComposer();
      return;
    }
    viewNonceRef.current += 1;
    activeIdRef.current = id;
    setActiveId(id);
    setViewKey((k) => k + 1);
    setDraft({ nonce: viewNonceRef.current, items: [] });
    setLoadErrorId(null);
    setLightbox(null);
    if (history !== 'none') {
      const url = chatPath(id);
      if (history === 'push') window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    }
    if (id) void loadConversation(id);
  });

  // First load.
  useEffect(() => {
    void refreshConversations();
    const id = activeIdRef.current;
    if (id) {
      if (isValidConversationId(id)) void loadConversation(id);
      else {
        toast.show(t('chat.toast.conversationNotFound'), { variant: 'error' });
        goToView(null, 'replace');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back / forward (and URLs restored by the router) → show the matching conversation.
  useEffect(() => {
    const id = conversationIdFromPath(pathname);
    if (id === undefined || id === activeIdRef.current) return;
    if (id !== null && !isValidConversationId(id)) return;
    goToView(id, 'none');
  }, [pathname, goToView]);

  // Tab title.
  const activeConversation = activeId ? conversations.find((c) => c.id === activeId) ?? null : null;
  const headerTitle = activeId ? activeConversation?.title || t('chat.sidebar.untitled') : t('chat.header.newCreation');
  const titleLoading = activeId !== null && !activeConversation && (loadingId === activeId || listState === 'loading');
  useEffect(() => {
    if (titleLoading) return;
    document.title = `${headerTitle} · ${BRAND_NAME}`;
  }, [headerTitle, titleLoading]);

  // ── Polling ────────────────────────────────────────────────────────────────────────────────
  const pollTargets = useMemo(() => {
    const list: PollTarget[] = [];
    Object.keys(threads).forEach((cid) => {
      threads[cid].forEach((item) => {
        if (!item.optimistic && needsPolling(item.generation)) list.push({ id: item.generation.id, type: item.generation.type });
      });
    });
    return list;
  }, [threads]);

  const applyGeneration = useStableCallback((g: GenerationDTO) => {
    setThreads((prev) => {
      const list = prev[g.conversationId];
      if (!list) return prev;
      let changed = false;
      const next = list.map((item) => {
        if (item.optimistic || item.generation.id !== g.id) return item;
        const merged = newerGeneration(item.generation, g);
        if (merged === item.generation) return item;
        changed = true;
        return { ...item, generation: merged };
      });
      return changed ? { ...prev, [g.conversationId]: next } : prev;
    });
  });

  const removeGeneration = useStableCallback((id: string) => {
    setThreads((prev) => {
      let changed = false;
      const next: Record<string, ChatItem[]> = {};
      Object.keys(prev).forEach((cid) => {
        const list = prev[cid];
        const filtered = list.filter((i) => i.optimistic || i.generation.id !== id);
        if (filtered.length !== list.length) changed = true;
        next[cid] = filtered;
      });
      return changed ? next : prev;
    });
  });

  useGenerationPoller(pollTargets, {
    onUpdate: (g, balance) => {
      setCredits(balance);
      const before = threadsRef.current[g.conversationId]?.find((i) => !i.optimistic && i.generation.id === g.id);
      const wasPending = before ? isPendingStatus(before.generation.status) : false;
      applyGeneration(g);
      if (wasPending && g.status === 'completed') {
        scheduleListRefresh();
        if (g.conversationId !== activeIdRef.current) {
          const conversationId = g.conversationId;
          toast.show(t(g.type === 'video' ? 'chat.toast.readyVideo' : 'chat.toast.readyImage'), {
            variant: 'success',
            action: { label: t('chat.toast.view'), onClick: () => goToView(conversationId, 'push') },
          });
        }
      }
    },
    onGone: removeGeneration,
    onUnauthorized: handleUnauthorized,
  });

  // ── Paywall ────────────────────────────────────────────────────────────────────────────────
  const openPaywall = useStableCallback((type: GenerationType | null, missing: number | null) => {
    setDrawerOpen(false);
    setPaywall({ open: true, type, missing, openedWith: credits });
  });
  const openPricing = useStableCallback(() => openPaywall(null, null));
  const closePaywall = useCallback(() => setPaywall((p) => ({ ...p, open: false })), []);

  // Credits arrived while the paywall was open (purchase in another tab, dev purchase…).
  useEffect(() => {
    if (!paywall.open || !paywall.type) return;
    if (credits > paywall.openedWith && credits >= GENERATION_COST[paywall.type]) {
      setPaywall((p) => ({ ...p, open: false }));
      toast.show(t('chat.paywall.creditsAdded'), { variant: 'success' });
      focusComposer();
    }
  }, [credits, paywall.open, paywall.type, paywall.openedWith, toast, t, focusComposer]);

  // Pick up purchases / refunds made elsewhere when the tab comes back.
  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 15_000) return;
      last = Date.now();
      void refreshUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refreshUser]);

  // ── Generation ─────────────────────────────────────────────────────────────────────────────
  const handleGenerateError = useStableCallback(
    (err: unknown, req: GenerationRequest, conversationId: string | null): SubmitResult => {
      const code = err instanceof ApiError ? err.code : 'internal';
      const details = err instanceof ApiError ? err.details : undefined;
      const field = details?.field;
      if (code === 'unauthorized') {
        handleUnauthorized();
        return 'error';
      }
      if (code === 'insufficient_credits') {
        const balance = typeof details?.balance === 'number' ? details.balance : null;
        const required = typeof details?.required === 'number' ? details.required : GENERATION_COST[req.type];
        if (balance !== null) setCredits(balance);
        openPaywall(req.type, Math.max(1, required - (balance ?? credits)));
        return 'paywall';
      }
      if (field === 'referenceGenerationId') {
        toast.show(t('chat.reference.unavailable'), { variant: 'error' });
        return 'reference_rejected';
      }
      if (field === 'referenceImage') {
        toast.show(t('chat.reference.invalid'), { variant: 'error' });
        return 'reference_rejected';
      }
      if (code === 'not_found' && conversationId) {
        forgetConversation(conversationId);
        toast.show(t('chat.toast.conversationNotFound'), { variant: 'error' });
        if (activeIdRef.current === conversationId) goToView(null, 'replace');
        return 'error';
      }
      toast.show(te(code), { variant: 'error' });
      return 'error';
    },
  );

  const submitGeneration = useStableCallback(async (req: GenerationRequest): Promise<SubmitResult> => {
    if (!user || submittingRef.current) return 'error';
    const cost = GENERATION_COST[req.type];
    if (user.credits < cost) {
      openPaywall(req.type, cost - user.credits);
      return 'paywall';
    }

    submittingRef.current = true;
    setSubmitting(true);
    const conversationId = activeIdRef.current;
    const nonce = viewNonceRef.current;
    const key = tempId('gen');
    const optimistic: ChatItem = {
      key,
      optimistic: true,
      fresh: true,
      generation: {
        id: key,
        conversationId: conversationId ?? '',
        type: req.type,
        prompt: req.prompt,
        aspectRatio: req.aspectRatio,
        cost,
        status: 'queued',
        resultUrl: null,
        referenceUrl: req.reference ? req.reference.previewUrl : null,
        errorCode: null,
        error: null,
        refunded: false,
        queuePosition: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
    };
    if (conversationId) {
      setThreads((prev) => ({ ...prev, [conversationId]: (prev[conversationId] || []).concat(optimistic) }));
    } else {
      setDraft((d) => (d.nonce === nonce ? { ...d, items: d.items.concat(optimistic) } : d));
    }
    setScrollSignal((s) => s + 1);

    try {
      const res = await studioApi.generate({
        conversationId,
        type: req.type,
        prompt: req.prompt,
        aspectRatio: req.aspectRatio,
        referenceImage: req.reference?.kind === 'upload' ? req.reference.dataUrl : null,
        referenceGenerationId: req.reference?.kind === 'generation' ? req.reference.generationId : null,
      });
      setCredits(res.balance);
      const realId = res.conversation.id;
      const real: ChatItem = { key, generation: res.generation, fresh: true };
      if (conversationId) {
        setThreads((prev) => ({ ...prev, [conversationId]: swapOptimistic(prev[conversationId] || [], key, real) }));
      } else {
        // First generation of a new conversation: adopt it without remounting anything.
        setDraft((d) => (d.nonce === nonce ? { ...d, items: d.items.filter((i) => i.key !== key) } : d));
        setThreads((prev) => ({ ...prev, [realId]: swapOptimistic(prev[realId] || [], key, real) }));
        if (viewNonceRef.current === nonce && activeIdRef.current === null) {
          activeIdRef.current = realId;
          setActiveId(realId);
          window.history.replaceState(null, '', chatPath(realId));
        }
      }
      upsertConversation(res.conversation, true);
      scheduleListRefresh();
      return 'ok';
    } catch (err) {
      if (conversationId) {
        setThreads((prev) =>
          prev[conversationId] ? { ...prev, [conversationId]: prev[conversationId].filter((i) => i.key !== key) } : prev,
        );
      } else {
        setDraft((d) => ({ ...d, items: d.items.filter((i) => i.key !== key) }));
      }
      return handleGenerateError(err, req, conversationId);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  });

  const handleComposerSubmit = useStableCallback(async () => {
    const text = prompt.trim();
    if (!text || !user || submittingRef.current || referenceBusy) return;
    const cost = GENERATION_COST[mode];
    if (user.credits < cost) {
      openPaywall(mode, cost - user.credits);
      return;
    }
    const req: GenerationRequest = { type: mode, prompt: text, aspectRatio: ratio, reference };
    setPrompt('');
    setReference(null);
    const result = await submitGeneration(req);
    if (result === 'ok') return;
    // Give the prompt back (unless the user already started typing something else).
    setPrompt((cur) => (cur.trim() ? cur : req.prompt));
    if (result !== 'reference_rejected' && req.reference) {
      const restored = req.reference;
      setReference((cur) => cur ?? restored);
    }
    if (result !== 'paywall') focusComposer();
  });

  // ── Reference image ────────────────────────────────────────────────────────────────────────
  const attachFile = useStableCallback(async (file: File) => {
    if (!isAcceptedReference(file)) {
      toast.show(t('chat.reference.unsupported'), { variant: 'error' });
      return;
    }
    const token = ++referenceTokenRef.current;
    setReferenceBusy(true);
    try {
      const prepared = await prepareReference(file);
      if (token !== referenceTokenRef.current) return;
      setReference({
        kind: 'upload',
        dataUrl: prepared.dataUrl,
        previewUrl: prepared.dataUrl,
        name: file.name || 'image.jpg',
        bytes: prepared.bytes,
      });
      focusComposer();
    } catch (err) {
      if (token !== referenceTokenRef.current) return;
      const problem = referenceProblemOf(err);
      toast.show(
        t(
          problem === 'unsupported'
            ? 'chat.reference.unsupported'
            : problem === 'too_large'
              ? 'chat.reference.tooLarge'
              : 'chat.reference.readError',
        ),
        { variant: 'error' },
      );
    } finally {
      if (token === referenceTokenRef.current) setReferenceBusy(false);
    }
  });

  const removeReference = useStableCallback(() => {
    referenceTokenRef.current += 1;
    setReference(null);
    setReferenceBusy(false);
  });

  const setGenerationReference = useStableCallback((g: GenerationDTO) => {
    if (!g.resultUrl) return;
    referenceTokenRef.current += 1;
    setReferenceBusy(false);
    setReference({ kind: 'generation', generationId: g.id, previewUrl: g.resultUrl });
  });

  // Paste an image anywhere in the chat (the composer handles its own paste events).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (anyModalOpen) return;
      const file = pickImageFile(e.clipboardData?.files);
      if (!file || e.clipboardData?.getData('text/plain').trim()) return;
      e.preventDefault();
      void attachFile(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [anyModalOpen, attachFile]);

  // Files dropped outside the drop zone must not navigate away from the app.
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const dropHandlers = {
    onDragEnter: (e: DragEvent<HTMLElement>) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = pickImageFile(e.dataTransfer.files);
      if (file) void attachFile(file);
    },
  };

  // ── Result actions ─────────────────────────────────────────────────────────────────────────
  const findImageByUrl = (url: string): GenerationDTO | null => {
    let found: GenerationDTO | null = null;
    const all = threadsRef.current;
    Object.keys(all).forEach((cid) => {
      all[cid].forEach((item) => {
        const g = item.generation;
        if (!found && !item.optimistic && g.type === 'image' && g.status === 'completed' && g.resultUrl === url) found = g;
      });
    });
    return found;
  };

  const regenerate = useStableCallback(async (g: GenerationDTO) => {
    if (!user || submittingRef.current) return;
    const cost = GENERATION_COST[g.type];
    if (user.credits < cost) {
      openPaywall(g.type, cost - user.credits);
      return;
    }
    let ref: ComposerReference | null = null;
    if (g.referenceUrl) {
      const source = findImageByUrl(g.referenceUrl);
      if (source && source.resultUrl) {
        ref = { kind: 'generation', generationId: source.id, previewUrl: source.resultUrl };
      } else {
        submittingRef.current = true;
        setSubmitting(true);
        try {
          const prepared = await referenceFromUrl(g.referenceUrl);
          ref = { kind: 'upload', dataUrl: prepared.dataUrl, previewUrl: prepared.dataUrl, name: 'reference.jpg', bytes: prepared.bytes };
        } catch {
          ref = null;
        } finally {
          submittingRef.current = false;
          setSubmitting(false);
        }
        if (!ref) {
          // Let the user re-attach the original reference themselves.
          setMode(g.type);
          setRatio(g.aspectRatio);
          setPrompt(g.prompt);
          toast.show(t('chat.regenerate.referenceMissing'), { variant: 'info' });
          focusComposer();
          return;
        }
      }
    }
    await submitGeneration({ type: g.type, prompt: g.prompt, aspectRatio: g.aspectRatio, reference: ref });
  });

  const actions = useMemo<GenerationActions>(
    () => ({
      onOpenImage: (g) => setLightbox(g),
      onUseReference: (g) => {
        setGenerationReference(g);
        focusComposer();
      },
      onAnimate: (g) => {
        setMode('video');
        setRatio(g.aspectRatio);
        setGenerationReference(g);
        setPrompt((cur) => (cur.trim() ? cur : t('chat.animate.defaultPrompt')));
        toast.show(t('chat.animate.ready'), { variant: 'info' });
        focusComposer();
      },
      onRegenerate: (g) => void regenerate(g),
    }),
    [setGenerationReference, focusComposer, regenerate, toast, t],
  );

  // ── Rename / delete ────────────────────────────────────────────────────────────────────────
  const renameConversation = useStableCallback(async (id: string, title: string) => {
    try {
      const res = await studioApi.renameConversation(id, title);
      upsertConversation(res.conversation, false);
    } catch (err) {
      if (isUnauthorized(err)) handleUnauthorized();
      throw err;
    }
  });

  const deleteConversation = useStableCallback(async (id: string) => {
    try {
      await studioApi.deleteConversation(id);
    } catch (err) {
      if (isUnauthorized(err)) handleUnauthorized();
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
    forgetConversation(id);
    toast.show(t('chat.delete.done'), { variant: 'success' });
    if (activeIdRef.current === id) goToView(null, 'replace');
    // In-progress generations of that conversation were refunded.
    void refreshUser();
  });

  // ── Drawer (mobile) ────────────────────────────────────────────────────────────────────────
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // Keep Tab inside the open drawer (it is a modal dialog on phones).
  const trapDrawerFocus = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const focusables = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || !drawerRef.current.contains(current))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);
  const wasDrawerOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) {
      wasDrawerOpen.current = true;
      const raf = window.requestAnimationFrame(() => drawerCloseRef.current?.focus());
      return () => window.cancelAnimationFrame(raf);
    }
    if (wasDrawerOpen.current) {
      wasDrawerOpen.current = false;
      menuButtonRef.current?.focus({ preventScroll: true });
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !anyModalOpen) setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, anyModalOpen]);

  // Close the drawer when the layout switches to desktop.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // ── Composer height (the message list reserves room for the floating composer) ───────────
  const composerObserver = useRef<ResizeObserver | null>(null);
  const composerRef = useCallback((el: HTMLDivElement | null) => {
    composerObserver.current?.disconnect();
    composerObserver.current = null;
    if (!el) return;
    setComposerHeight(el.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setComposerHeight(el.offsetHeight));
    ro.observe(el);
    composerObserver.current = ro;
  }, []);

  useEffect(
    () => () => {
      composerObserver.current?.disconnect();
      if (listTimerRef.current !== null) window.clearTimeout(listTimerRef.current);
    },
    [],
  );

  // Session ended (expired elsewhere): leave once the logout navigation had its chance.
  useEffect(() => {
    if (user) return;
    const timer = window.setTimeout(() => {
      const path = window.location.pathname;
      router.replace(`/studio/login?next=${encodeURIComponent(path.startsWith('/studio') ? path : '/studio/chat')}`);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [user, router]);

  // ── Render ─────────────────────────────────────────────────────────────────────────────────
  const typeHints = useMemo(() => {
    const hints: Record<string, GenerationType | undefined> = {};
    Object.keys(threads).forEach((cid) => {
      const list = threads[cid];
      if (list.length) hints[cid] = list[list.length - 1].generation.type;
    });
    return hints;
  }, [threads]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-studio-orange" style={{ height: '100dvh' }}>
        <Spinner size={28} />
      </div>
    );
  }

  const items = activeId ? threads[activeId] ?? [] : draft.items;
  const viewLoading = activeId !== null && loadingId === activeId && !threads[activeId];
  const viewError = activeId !== null && loadErrorId === activeId && !threads[activeId];

  const sidebarProps = {
    conversations,
    state: listState,
    activeId,
    typeHints,
    onSelect: (id: string) => goToView(id, 'push'),
    onRetry: () => {
      setListState('loading');
      void refreshConversations();
    },
    onRequestRename: setRenaming,
    onRequestDelete: setDeleting,
    onNew: () => goToView(null, 'push'),
    onOpenPaywall: openPricing,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ height: '100dvh' }}>
      {/* Desktop sidebar */}
      <aside className="hidden w-[280px] flex-none border-r border-studio-line bg-studio-surface/60 lg:block">
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div key="drawer" className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeDrawer}
              aria-hidden="true"
              className="absolute inset-0 bg-black/70"
            />
            <motion.div
              ref={drawerRef}
              id={drawerId}
              onKeyDown={trapDrawerFocus}
              role="dialog"
              aria-modal="true"
              aria-label={t('chat.sidebar.nav')}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] border-r border-studio-line bg-studio-surface shadow-2xl"
            >
              <Sidebar {...sidebarProps} onClose={closeDrawer} closeButtonRef={drawerCloseRef} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Conversation */}
      <main className="relative flex min-w-0 flex-1 flex-col" {...dropHandlers}>
        <ChatHeader
          title={headerTitle}
          titleLoading={titleLoading}
          credits={credits}
          drawerOpen={drawerOpen}
          drawerId={drawerId}
          menuButtonRef={menuButtonRef}
          onOpenDrawer={() => setDrawerOpen(true)}
          onNew={() => goToView(null, 'push')}
          onOpenPaywall={openPricing}
        />

        <MessageList
          viewKey={viewKey}
          items={items}
          loading={viewLoading}
          error={viewError}
          onRetryLoad={() => activeId && void loadConversation(activeId)}
          bottomPadding={composerHeight}
          scrollSignal={scrollSignal}
          busy={submitting}
          actions={actions}
          empty={
            <EmptyState
              mode={mode}
              onModeChange={(m) => {
                setMode(m);
                focusComposer();
              }}
              onPickSuggestion={(text, r) => {
                setPrompt(text);
                setRatio(r);
                focusComposer();
              }}
            />
          }
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <div
            ref={composerRef}
            className="bg-gradient-to-t from-studio-bg via-studio-bg/90 to-transparent px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-7 sm:px-6"
          >
            <div className="pointer-events-auto">
              <Composer
                mode={mode}
                onModeChange={setMode}
                ratio={ratio}
                onRatioChange={setRatio}
                prompt={prompt}
                onPromptChange={setPrompt}
                reference={reference}
                referenceBusy={referenceBusy}
                onRemoveReference={removeReference}
                onAttachFile={(file) => void attachFile(file)}
                submitting={submitting}
                onSubmit={() => void handleComposerSubmit()}
                textareaRef={textareaRef}
                credits={credits}
                onGetCredits={() => openPaywall(mode, credits < GENERATION_COST[mode] ? GENERATION_COST[mode] - credits : null)}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute inset-2 z-30 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-studio-orange/70 bg-studio-bg/85 text-center sm:inset-4"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl studio-gradient-bg studio-glow text-white">
                <IconPaperclip size={26} />
              </span>
              <p className="font-display text-lg font-semibold text-studio-text">{t('chat.composer.dropTitle')}</p>
              <p className="text-sm text-studio-muted">{t('chat.composer.dropHint')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <PaywallModal open={paywall.open} onClose={closePaywall} missing={paywall.missing} type={paywall.type} />
      <Lightbox generation={lightbox} onClose={() => setLightbox(null)} onAnimate={actions.onAnimate} />
      <RenameModal conversation={renaming} onClose={() => setRenaming(null)} onRename={renameConversation} />
      <DeleteModal conversation={deleting} onClose={() => setDeleting(null)} onDelete={deleteConversation} />
    </div>
  );
}
