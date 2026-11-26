import { useState } from 'react';
import { Check, Code2, Copy, FileDown, Pencil, Trash2 } from 'lucide-react';
import { RARITY_THEMES } from '../data/rarities';
import type { DndItem } from '../types/item';
import { WebpIcon } from './WebpIcon';

interface ItemCardProps {
  item: DndItem;
  isSelected?: boolean;
  isPreview?: boolean;
  centerContent?: boolean;
  isPdfSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit?: (item: DndItem) => void;
  onExportPdf?: (item: DndItem) => void;
  onInspectJson?: (item: DndItem) => void;
  onRemove?: (id: string) => void;
}

export function ItemCard({
  item,
  isSelected = false,
  isPreview = false,
  centerContent = false,
  isPdfSelected = false,
  onToggleSelect,
  onEdit,
  onExportPdf,
  onInspectJson,
  onRemove,
}: ItemCardProps) {
  const [copied, setCopied] = useState(false);
  const theme = RARITY_THEMES[item.rarity];

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable
    }
  };

  const modifiers = item.statModifiers;

  return (
    <article
      className={`relative h-[488px] w-full rounded-xl bg-[#161920] flex flex-col justify-between overflow-hidden transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSelected ? 'ring-1 ring-[#D4A853]/70' : ''
      }`}
      style={{
        border: `1px solid ${theme.borderStyle}`,
        backgroundImage: theme.cardWashGradient,
      }}
    >
      {/* Top Content Block */}
      <div
        className={`p-5 flex flex-col gap-3.5 min-h-0 flex-1 ${
          centerContent ? 'justify-center' : 'pb-0'
        }`}
      >
        {/* Header Zone: Fixed 54px */}
        <header className="h-[54px] flex flex-col justify-between shrink-0">
          <div className="flex items-center justify-between gap-2 text-xs leading-none">
            <div className="flex items-center gap-1.5 truncate">
              <span className={`font-semibold tracking-wide ${theme.textClass}`}>
                {item.rarity}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-300 truncate">{item.category}</span>
              {item.requiresAttunement && (
                <>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-400 shrink-0">Attunement</span>
                </>
              )}
            </div>
            {!isPreview && onToggleSelect ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={isPdfSelected}
                onClick={() => onToggleSelect(item.id)}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853] ${
                  isPdfSelected
                    ? 'text-[#D4A853]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${
                    isPdfSelected
                      ? 'bg-[#D4A853] border-[#D4A853] text-[#0E1014]'
                      : 'border-slate-600 bg-[#0E1014]'
                  }`}
                >
                  {isPdfSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                Select
              </button>
            ) : (
              <span className="font-mono text-[11px] text-slate-500 shrink-0">
                .{item.icon.format}
              </span>
            )}
          </div>

          <h3
            title={item.name}
            className="font-display text-[19px] leading-snug font-semibold text-slate-100 truncate"
          >
            {item.name || 'Untitled Relic'}
          </h3>
        </header>

        {/* WebP Icon + Appraisal Row: Fixed 76px */}
        <div className="h-[76px] flex items-center gap-3.5 shrink-0">
          <div
            className="w-[76px] h-[76px] rounded-lg overflow-hidden shrink-0 bg-[#0E1014]"
            style={{ border: `1px solid ${theme.iconFrameBorder}` }}
          >
            <WebpIcon
              src={item.icon.url}
              alt={`${item.name} icon`}
              className="w-full h-full"
            />
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Value</div>
              <div className="font-mono tabular-nums text-slate-200 font-medium truncate">
                {isPreview ? 'Pending' : `${item.estimatedValueGp.toLocaleString()} gp`}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Weight</div>
              <div className="font-mono tabular-nums text-slate-200 font-medium truncate">
                {isPreview ? 'Pending' : `${item.weightLb} lb`}
              </div>
            </div>
            <div className="col-span-2 min-w-0">
              <div className="text-[11px] text-slate-400">Charges / Resonance</div>
              <div className="font-mono tabular-nums text-slate-300 truncate">
                {isPreview
                  ? 'Awaiting generation'
                  : item.charges
                  ? `${item.charges.max} max · ${item.charges.recharge}`
                  : item.attunementRequirement
                  ? `Req: ${item.attunementRequirement}`
                  : 'Passive enchantment'}
              </div>
            </div>
          </div>
        </div>

        {/* Flavor Text Zone: Fixed 72px */}
        <div className="h-[72px] py-2 border-y border-white/[0.07] flex items-center shrink-0">
          <p className="text-[13px] leading-[1.45] italic text-slate-300 line-clamp-3">
            {item.flavorText}
          </p>
        </div>

        {/* Stat Modifiers & Mechanics Zone: Fixed uniform height container */}
        <div
          className={`min-h-0 flex flex-col gap-2.5 ${
            centerContent ? 'justify-center' : 'flex-1 justify-between pb-3'
          }`}
        >
          <div className="max-h-[104px] overflow-y-auto space-y-1.5 pr-0.5">
            {modifiers.length > 0 ? (
              modifiers.map((mod, idx) => (
                <div
                  key={`${mod.attribute}-${idx}`}
                  className="min-h-[28px] px-2.5 py-1 rounded-md bg-[#0E1014]/75 border border-white/[0.06] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {mod.attribute}
                    </span>
                    {mod.note && (
                      <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                        {mod.note}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono tabular-nums text-xs font-semibold shrink-0 ${theme.statValueClass}`}
                  >
                    {mod.modifier}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-[28px] px-2.5 rounded-md bg-[#0E1014]/40 border border-white/[0.04] flex items-center text-[11px] text-slate-500">
                No stat modifiers
              </div>
            )}
          </div>

          <div className="min-h-[38px] shrink-0">
            <p className="text-xs leading-[1.5] text-slate-400 line-clamp-3">
              {item.mechanicsSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Uniform Footer Action Bar: Fixed 48px */}
      <footer className="h-[48px] px-3.5 border-t border-white/[0.07] bg-[#111319] flex items-center justify-between gap-2 shrink-0">
        {isPreview ? (
          <span className="text-xs text-slate-400 truncate">
            Live card preview · Configure &amp; click Generate Item
          </span>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                >
                  <Pencil className="w-3 h-3 text-[#D4A853]" />
                  Edit
                </button>
              )}
              {onInspectJson && (
                <button
                  type="button"
                  onClick={() => onInspectJson(item)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                >
                  <Code2 className="w-3.5 h-3.5 text-[#D4A853]" />
                  JSON
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              {onExportPdf && (
                <button
                  type="button"
                  onClick={() => onExportPdf(item)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#D4A853]" />
                  PDF
                </button>
              )}
            </div>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.name}`}
                title="Remove from vault"
                className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </footer>
    </article>
  );
}
