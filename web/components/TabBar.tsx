'use client';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'issues', label: 'Issues', icon: '\u26A0' },
  { id: 'security', label: 'Security', icon: '\uD83D\uDD12' },
  { id: 'thirdparty', label: '3rd Party', icon: '\uD83C\uDF10' },
  { id: 'resources', label: 'Resources', icon: '\u2630' },
  { id: 'timing', label: 'Timing', icon: '\u23F1' },
  { id: 'ai', label: 'AI Analysis', icon: '\u2728' },
];

interface TabBarProps {
  active: string;
  onChange: (id: string) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`glass-tab flex items-center gap-2 ${active === tab.id ? 'active' : ''}`}
        >
          <span className="text-sm">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
