'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

interface DropZoneProps {
  onLoad: (har: unknown) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
}

export default function DropZone({ onLoad, fileName, setFileName }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCount = useRef(0);

  function handleFile(file: File) {
    if (!file.name.endsWith('.har') && !file.name.endsWith('.json')) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const har = JSON.parse(e.target?.result as string);
        if (!har.log?.entries) throw new Error('Invalid HAR \u2014 missing log.entries');
        onLoad(har);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to parse file');
      }
    };
    reader.readAsText(file);
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onPasteAnalyze() {
    const text = pasteValue.trim();
    if (!text) return;
    try {
      const har = JSON.parse(text);
      if (!har.log?.entries) throw new Error('Invalid HAR \u2014 missing log.entries');
      setFileName('pasted-input.json');
      onLoad(har);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }

  return (
    <section className="mb-8">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center
          transition-all duration-300
          ${dragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
          }
        `}
      >
        <input ref={inputRef} type="file" accept=".har,.json" onChange={onInputChange} className="hidden" />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <svg className={`w-12 h-12 transition-colors duration-300 ${dragging ? 'text-indigo-400' : 'text-slate-500'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-100">
            {fileName ? `Loaded: ${fileName}` : 'Drop your HAR file here'}
          </h2>
          <p className="text-sm text-slate-500">or click to browse &middot; supports .har and JSON</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">or paste</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      <div className="mt-4 flex gap-3">
        <textarea
          value={pasteValue}
          onChange={e => setPasteValue(e.target.value)}
          placeholder="Paste HAR JSON here\u2026"
          rows={2}
          className="input flex-1 resize-none"
        />
        <button onClick={onPasteAnalyze} className="btn-primary shrink-0 self-start mt-0.5">
          Analyze
        </button>
      </div>
    </section>
  );
}
