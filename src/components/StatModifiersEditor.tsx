import { Plus, Swords, Trash2 } from 'lucide-react';
import type { StatModifier } from '../types/item';

interface StatModifiersEditorProps {
  stats: StatModifier[];
  onChange: (next: StatModifier[]) => void;
  maxStats?: number;
}

export function StatModifiersEditor({
  stats,
  onChange,
  maxStats = 8,
}: StatModifiersEditorProps) {
  const handleUpdate = (
    index: number,
    field: keyof StatModifier,
    value: string
  ) => {
    const next = stats.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(stats.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (stats.length >= maxStats) return;
    onChange([...stats, { attribute: '', modifier: '', note: '' }]);
  };

  const handleWeaponDamagePreset = () => {
    onChange([
      {
        attribute: 'Weapon Damage',
        modifier: '1d8+1 Slashing',
        note: 'Melee attack',
      },
    ]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-300 tabular-nums">
          Stat Modifiers ({stats.length}/{maxStats})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleWeaponDamagePreset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white bg-[#0E1014] border border-white/[0.1] hover:border-white/[0.2] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Swords className="w-3 h-3 text-[#D4A853]" />
            Weapon Damage Only
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={stats.length >= maxStats}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-[#0E1014] bg-[#D4A853] hover:bg-[#DFB766] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            Add Stat
          </button>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="p-3 rounded-lg bg-[#0E1014] border border-dashed border-white/[0.1] text-xs text-slate-400 text-center">
          No stats added. Click <strong className="text-slate-200">Add Stat</strong> or{' '}
          <strong className="text-slate-200">Weapon Damage Only</strong>.
        </div>
      ) : (
        <div className="space-y-2">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-center bg-[#0E1014] p-2 rounded-lg border border-white/[0.08]"
            >
              <input
                type="text"
                value={stat.attribute}
                maxLength={28}
                onChange={(e) => handleUpdate(idx, 'attribute', e.target.value)}
                placeholder="Stat (e.g. Weapon Damage)"
                aria-label={`Stat ${idx + 1} name`}
                className="col-span-5 h-8 px-2.5 rounded-md bg-[#161920] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
              />
              <input
                type="text"
                value={stat.modifier}
                maxLength={24}
                onChange={(e) => handleUpdate(idx, 'modifier', e.target.value)}
                placeholder="Value (e.g. 1d8+2)"
                aria-label={`Stat ${idx + 1} modifier`}
                className="col-span-3 h-8 px-2.5 rounded-md bg-[#161920] border border-white/[0.08] font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
              />
              <input
                type="text"
                value={stat.note ?? ''}
                maxLength={36}
                onChange={(e) => handleUpdate(idx, 'note', e.target.value)}
                placeholder="Note (optional)"
                aria-label={`Stat ${idx + 1} note`}
                className="col-span-3 h-8 px-2.5 rounded-md bg-[#161920] border border-white/[0.08] text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label={`Remove stat ${idx + 1}`}
                className="col-span-1 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
