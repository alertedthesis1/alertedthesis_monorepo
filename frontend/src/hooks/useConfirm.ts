import { useState, useCallback } from 'react';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (
      title: string,
      message: string,
      options?: {
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'info';
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          title,
          message,
          confirmText: options?.confirmText,
          cancelText: options?.cancelText,
          variant: options?.variant || 'danger',
          onConfirm: () => resolve(true),
        });
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  return {
    confirm,
    confirmState,
    closeConfirm,
  };
}
