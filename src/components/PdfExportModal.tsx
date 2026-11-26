import { useEffect, useState } from 'react';
import { AlertCircle, Download, Loader2, Scissors, X } from 'lucide-react';
import { RARITY_THEMES } from '../data/rarities';
import type { DndItem } from '../types/item';
import {
  computeSheetLayout,
  exportItemsToPdf,
  type PaperFormat,
  type PdfCardStyle,
  type SleevePreset,
} from '../utils/pdfExporter';

interface PdfExportModalProps {
  isOpen: boolean;
  items: DndItem[];
  onClose: () => void;
}

export function PdfExportModal({
  isOpen,
  items,
  onClose,
}: PdfExportModalProps) {
  const [sleevePreset, setSleevePreset] = useState<SleevePreset>('standard');
  const [paperFormat, setPaperFormat] = useState<PaperFormat>('letter');
  const [cardStyle, setCardStyle] = useState<PdfCardStyle>('dark');
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const layout = computeSheetLayout(sleevePreset, paperFormat);
  const totalCards = items.length * copiesPerItem;
  const totalPages = Math.max(1, Math.ceil(totalCards / layout.cardsPerPage));

  const previewSlots: Array<DndItem | null> = [];
  for (const item of items) {
    for (let c = 0; c < copiesPerItem; c++) {
      if (previewSlots.length < layout.cardsPerPage) {
        previewSlots.push(item);
      }
    }
  }
  while (previewSlots.length < layout.cardsPerPage) {
    previewSlots.push(null);
  }

  const handleDownload = async () => {
    setErrorMsg(null);
    setIsExporting(true);
    try {
      await exportItemsToPdf(items, {
        sleevePreset,
        paperFormat,
        cardStyle,
        showCutMarks,
        copiesPerItem,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to generate PDF sheet.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-export-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-[#161920] border border-white/[0.12] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div>
            <h2
              id="pdf-export-title"
              className="font-display text-lg font-semibold text-slate-100"
            >
              Export Cut-Ready Card Sleeve PDF
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              {items.length} chosen {items.length === 1 ? 'item' : 'items'} ·{' '}
              {totalCards} {totalCards === 1 ? 'card' : 'cards'} across{' '}
              {totalPages} {totalPages === 1 ? 'page' : 'pages'} at 100% print scale
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PDF export modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="md:col-span-7 space-y-5">
            {/* Sleeve Size */}
            <div>
              <span className="block text-xs font-medium text-slate-300 mb-2">
                Card Sleeve Size
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSleevePreset('standard')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    sleevePreset === 'standard'
                      ? 'bg-[#D4A853]/12 border-[#D4A853] text-white'
                      : 'bg-[#0E1014] border-white/[0.08] text-slate-300 hover:border-white/[0.18]'
                  }`}
                >
                  <div className="text-xs font-semibold">Standard Sleeve</div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    63 × 88 mm · 9 / page
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSleevePreset('tarot')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    sleevePreset === 'tarot'
                      ? 'bg-[#D4A853]/12 border-[#D4A853] text-white'
                      : 'bg-[#0E1014] border-white/[0.08] text-slate-300 hover:border-white/[0.18]'
                  }`}
                >
                  <div className="text-xs font-semibold">Tarot Sleeve</div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    70 × 120 mm · 4 / page
                  </div>
                </button>
              </div>
            </div>

            {/* Paper Format + Card Theme */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-slate-300 mb-2">
                  Paper Size
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#0E1014] border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setPaperFormat('letter')}
                    className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      paperFormat === 'letter'
                        ? 'bg-[#252A36] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    US Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperFormat('a4')}
                    className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      paperFormat === 'a4'
                        ? 'bg-[#252A36] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    A4
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-300 mb-2">
                  Print Style
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#0E1014] border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setCardStyle('dark')}
                    className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      cardStyle === 'dark'
                        ? 'bg-[#252A36] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dark Relic
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardStyle('light')}
                    className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      cardStyle === 'light'
                        ? 'bg-[#252A36] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ink-Saver
                  </button>
                </div>
              </div>
            </div>

            {/* Copies & Cut Guides */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label
                  htmlFor="pdf-copies-input"
                  className="block text-xs font-medium text-slate-300 mb-2"
                >
                  Copies per Item
                </label>
                <div className="flex items-center h-10 rounded-lg bg-[#0E1014] border border-white/[0.08] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCopiesPerItem((c) => Math.max(1, c - 1))}
                    className="w-10 h-full text-sm font-medium text-slate-300 hover:bg-white/[0.06] cursor-pointer"
                    aria-label="Decrease copies"
                  >
                    -
                  </button>
                  <input
                    id="pdf-copies-input"
                    type="number"
                    min={1}
                    max={9}
                    value={copiesPerItem}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) {
                        setCopiesPerItem(Math.max(1, Math.min(9, val)));
                      }
                    }}
                    className="flex-1 w-full text-center font-mono text-xs text-slate-100 bg-transparent focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setCopiesPerItem((c) => Math.min(9, c + 1))}
                    className="w-10 h-full text-sm font-medium text-slate-300 hover:bg-white/[0.06] cursor-pointer"
                    aria-label="Increase copies"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCutMarks((v) => !v)}
                className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  showCutMarks
                    ? 'bg-[#D4A853]/12 border-[#D4A853] text-slate-100'
                    : 'bg-[#0E1014] border-white/[0.08] text-slate-400'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Scissors className="w-3.5 h-3.5 text-[#D4A853]" />
                  Crop Cut Marks
                </span>
                <span className="font-mono text-[11px]">
                  {showCutMarks ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400">
              Print at <strong className="text-slate-200">100% / Actual Size</strong>{' '}
              (disable “Fit to Page”) so each card cuts cleanly to{' '}
              <span className="font-mono text-slate-300">
                {layout.cardWidthMm}×{layout.cardHeightMm} mm
              </span>{' '}
              and slides straight into standard tabletop card sleeves.
            </p>
          </div>

          {/* Sheet Preview Column */}
          <div className="md:col-span-5 flex flex-col items-center justify-center rounded-lg bg-[#0E1014] border border-white/[0.08] p-4">
            <div className="text-[11px] text-slate-400 mb-2.5">
              Page 1 Sheet Layout ({paperFormat === 'letter' ? 'US Letter' : 'A4'})
            </div>

            {/* Paper Aspect Mock */}
            <div
              className="w-full max-w-[185px] bg-white rounded-xs p-2.5 shadow-sm"
              style={{
                aspectRatio:
                  paperFormat === 'letter' ? '215.9 / 279.4' : '210 / 297',
              }}
            >
              <div
                className="w-full h-full grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                }}
              >
                {previewSlots.map((slot, idx) => {
                  if (!slot) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="border border-dashed border-slate-200 rounded-[1px]"
                      />
                    );
                  }
                  const theme = RARITY_THEMES[slot.rarity];
                  return (
                    <div
                      key={`${slot.id}-${idx}`}
                      className={`rounded-[1px] p-1 flex flex-col justify-between overflow-hidden ${
                        cardStyle === 'dark' ? 'bg-[#14171E]' : 'bg-slate-50'
                      }`}
                      style={{
                        border: `1px solid ${theme.accentHex}`,
                      }}
                    >
                      <div
                        className="h-0.5 w-full"
                        style={{ backgroundColor: theme.accentHex }}
                      />
                      <div
                        className={`text-[7px] leading-tight font-semibold truncate ${
                          cardStyle === 'dark' ? 'text-slate-100' : 'text-slate-900'
                        }`}
                      >
                        {slot.name}
                      </div>
                      <div
                        className="text-[6px] truncate"
                        style={{ color: theme.accentHex }}
                      >
                        {slot.rarity}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#111319] flex flex-col sm:flex-row items-center justify-between gap-3">
          {errorMsg ? (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Icons are embedded directly from your WebP, SVG, or image assets.
            </span>
          )}

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || items.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-[#D4A853] hover:bg-[#DFB766] disabled:opacity-50 text-[#0E1014] transition-colors cursor-pointer whitespace-nowrap"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isExporting ? 'Building PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
