export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-300">Analyzing your HAR file\u2026</p>
        <p className="text-xs text-slate-600 mt-1">Parsing entries, computing metrics, detecting bottlenecks</p>
      </div>
    </div>
  );
}
