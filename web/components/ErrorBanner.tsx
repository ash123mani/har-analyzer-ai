interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20">
      <span className="text-red-400 text-lg shrink-0 mt-0.5">{'\u26A0'}</span>
      <p className="text-sm text-red-300 flex-1">{message}</p>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-300 shrink-0 text-lg leading-none">&times;</button>
    </div>
  );
}
