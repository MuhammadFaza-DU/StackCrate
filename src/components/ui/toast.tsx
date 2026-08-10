'use client';

import * as React from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastsProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const toastStyles: Record<ToastType, { classes: string; icon: React.ReactNode }> = {
  success: {
    classes: 'border-green-500/40 bg-card text-foreground',
    icon: <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />,
  },
  error: {
    classes: 'border-red-500/40 bg-card text-foreground',
    icon: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
  },
  info: {
    classes: 'border-blue-500/40 bg-card text-foreground',
    icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  },
};

const text = (message: Message) => typeof message === 'function' ? message() : message;

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  const { dictionary } = useLocale();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {toasts.map((t) => {
          const style = toastStyles[t.type];
          return (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg', style.classes)}
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              {style.icon}
              <span className="flex-1 break-words">{t.message}</span>
              <button
                onClick={() => onDismiss(t.id)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                 aria-label={text(dictionary.common.dismissNotification)}
              >
                <X className="w-4 h-4" />
              </button>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const showToast = React.useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
