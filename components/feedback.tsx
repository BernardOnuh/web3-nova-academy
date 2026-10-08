// components/feedback.tsx — toasts + confirm dialog (replaces window.alert / window.confirm)
"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Button, Modal, cx } from './ui';

type ToastTone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: ToastTone; message: string }

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}

const TOAST_ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
const TOAST_TONE = {
  success: 'border-success/30 text-success',
  error: 'border-danger/30 text-danger',
  info: 'border-brand/30 text-brand-soft',
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);

  const toast = useCallback<FeedbackApi['toast']>((message, tone = 'success') => {
    const id = ++nextId.current;
    setToasts(t => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const confirm = useCallback<FeedbackApi['confirm']>(
    opts => new Promise(resolve => setPending({ ...opts, resolve })),
    [],
  );

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto" aria-live="polite">
        {toasts.map(t => {
          const Icon = TOAST_ICON[t.tone];
          return (
            <div
              key={t.id}
              className={cx('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur animate-toast', TOAST_TONE[t.tone])}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm text-gray-100">{t.message}</p>
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-faint hover:text-white">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!pending}
        onClose={() => settle(false)}
        title={pending?.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>Cancel</Button>
            <Button variant={pending?.danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="text-sm text-muted">{pending?.description ?? 'Are you sure?'}</div>
      </Modal>
    </FeedbackContext.Provider>
  );
}
