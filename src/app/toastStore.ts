// app/toastStore.ts — tiny ephemeral toast notifications. Any module can call
// `toast('저장했어요')`; the <Toasts/> host renders + auto-dismisses them.
import { create } from 'zustand';

export interface ToastItem {
  id: number;
  msg: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (msg: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (msg) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items, { id, msg }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 2400);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget toast from anywhere (UI or controllers). */
export function toast(msg: string): void {
  useToastStore.getState().push(msg);
}
