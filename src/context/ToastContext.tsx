"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, options?: { type?: ToastType; description?: string; duration?: number }) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options: { type?: ToastType; description?: string; duration?: number } = {}) => {
      const id = Math.random().toString(36).substring(2, 9);
      const { type = "info", description, duration = 5000 } = options;
      
      const newToast: ToastMessage = { id, type, message, description, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, description?: string) => toast(message, { type: "success", description }), [toast]);
  const error = useCallback((message: string, description?: string) => toast(message, { type: "error", description }), [toast]);
  const info = useCallback((message: string, description?: string) => toast(message, { type: "info", description }), [toast]);
  const warning = useCallback((message: string, description?: string) => toast(message, { type: "warning", description }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      <>
        {children}
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              type={t.type}
              message={t.message}
              description={t.description}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </div>
      </>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
