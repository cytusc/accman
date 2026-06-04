import { useAppStore } from '../store/appStore';

export default function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
      ))}
    </div>
  );
}
