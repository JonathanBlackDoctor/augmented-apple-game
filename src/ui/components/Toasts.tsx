// ui/components/Toasts.tsx — fixed-position host for transient toast messages.
// Mounted once at the app root; reads the shared toast store.
import { useToastStore } from '../../app/toastStore';

export function Toasts() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  if (items.length === 0) return null;
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map((t) => (
        <button key={t.id} className="toast" onClick={() => dismiss(t.id)}>
          {t.msg}
        </button>
      ))}
    </div>
  );
}
