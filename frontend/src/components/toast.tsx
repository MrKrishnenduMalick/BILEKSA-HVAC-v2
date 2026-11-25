"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; tone: "success" | "error"; text: string };
type Ctx = { notify: (text: string, tone?: Toast["tone"]) => void };
const ToastContext = createContext<Ctx>({ notify: () => undefined });

export const useToast = () => useContext(ToastContext);

/** Small confirmations after an action ("Callback marked done"). Errors stay until closed. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback(
    (text: string, tone: Toast["tone"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, tone, text }]);
      if (tone === "success") setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="glass-strong animate-rise pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 text-sm text-frost"
          >
            {t.tone === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-leaf" aria-hidden />
            ) : (
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-signal" aria-hidden />
            )}
            <p className="flex-1 leading-6">{t.text}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-md p-0.5 text-haze hover:text-frost"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
