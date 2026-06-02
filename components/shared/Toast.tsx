"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
};

const colors = {
  success: "#52B788",
  error: "#C1440E",
  warning: "#F4A261",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 lg:bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(({ id, message, type }) => {
            const Icon = icons[type];
            const color = colors[type];
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg max-w-xs"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <Icon size={16} style={{ color, flexShrink: 0 }} />
                <p className="text-sm flex-1" style={{ color: "#E8E4D9" }}>{message}</p>
                <button onClick={() => dismiss(id)} style={{ color: "#5A5A50" }} className="hover:opacity-70">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
