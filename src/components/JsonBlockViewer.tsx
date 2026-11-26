import { useState } from 'react';
import { Check, Copy, Download, FileDown } from 'lucide-react';
import { RARITY_THEMES } from '../data/rarities';
import type { DndItem } from '../types/item';

interface JsonBlockViewerProps {
  item: DndItem;
  onExportPdf?: (item: DndItem) => void;
}

export function JsonBlockViewer({ item, onExportPdf }: JsonBlockViewerProps) {
  const [copied, setCopied] = useState(false);
  const formatted = JSON.stringify(item, null, 2);
  const theme = RARITY_THEMES[item.rarity];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleDownload = () => {
    const blob = new Blob([formatted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    link.href = url;
    link.download = `${safeName || 'dnd-item'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="w-full h-[488px] rounded-xl bg-[#0B0D11] flex flex-col overflow-hidden"
      style={{ border: `1px solid ${theme.borderStyle}` }}
    >
      <div className="px-4 py-3 border-b border-white/[0.08] bg-[#13161D] flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-200 truncate">
            {item.name}
          </div>
          <div className="text-[11px] text-slate-400">
            <span className={theme.textClass}>{item.rarity}</span>
            <span className="mx-1.5 text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="font-mono">{item.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy JSON
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#D4A853] hover:bg-[#DFB766] text-[#0E1014] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          {onExportPdf && item.id !== 'preview-pending' && (
            <button
              type="button"
              onClick={() => onExportPdf(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
            >
              <FileDown className="w-3.5 h-3.5 text-[#D4A853]" />
              PDF
            </button>
          )}
        </div>
      </div>

      <pre className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-[1.6] text-slate-200 tabular-nums selection:bg-[#D4A853]/30">
        <code>{formatted}</code>
      </pre>
    </div>
  );
}
