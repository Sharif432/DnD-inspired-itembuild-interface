import { useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Code2,
  Database,
  FileDown,
  FileSpreadsheet,
  LayoutGrid,
  Pencil,
  Search,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { RARITIES, RARITY_THEMES } from '../data/rarities';
import type { DndItem, Rarity } from '../types/item';
import {
  exportVaultToCsv,
  exportVaultToSql,
  formatStatsForSpreadsheet,
  parseImportedVaultFile,
} from '../utils/vaultFormats';
import { ItemCard } from './ItemCard';
import { WebpIcon } from './WebpIcon';

interface VaultGridProps {
  items: DndItem[];
  selectedItemId: string | null;
  selectedPdfIds: string[];
  onToggleSelectPdf: (id: string) => void;
  onSelectAllFiltered: (ids: string[]) => void;
  onClearPdfSelection: () => void;
  onExportSelectedPdf: () => void;
  onExportSinglePdf: (item: DndItem) => void;
  onEditItem: (item: DndItem) => void;
  onInspectJson: (item: DndItem) => void;
  onRemoveItem: (id: string) => void;
  onImportItems: (imported: DndItem[]) => void;
}

type SortKey = 'createdAt' | 'name' | 'rarity' | 'category' | 'value' | 'weight';

const RARITY_ORDER: Record<Rarity, number> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  'Very Rare': 4,
  Legendary: 5,
  Artifact: 6,
};

export function VaultGrid({
  items,
  selectedItemId,
  selectedPdfIds,
  onToggleSelectPdf,
  onSelectAllFiltered,
  onClearPdfSelection,
  onExportSelectedPdf,
  onExportSinglePdf,
  onEditItem,
  onInspectJson,
  onRemoveItem,
  onImportItems,
}: VaultGridProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((item) => {
      if (rarityFilter !== 'All' && item.rarity !== rarityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.flavorText.toLowerCase().includes(q) ||
        item.mechanicsSummary.toLowerCase().includes(q) ||
        item.statModifiers.some(
          (m) =>
            m.attribute.toLowerCase().includes(q) ||
            m.modifier.toLowerCase().includes(q)
        )
      );
    });

    if (viewMode === 'cards' && sortKey === 'createdAt' && !sortAsc) {
      return list;
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'rarity':
          cmp = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'value':
          cmp = a.estimatedValueGp - b.estimatedValueGp;
          break;
        case 'weight':
          cmp = a.weightLb - b.weightLb;
          break;
        case 'createdAt':
        default:
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [items, rarityFilter, searchQuery, viewMode, sortKey, sortAsc]);

  const filteredIds = filteredItems.map((i) => i.id);
  const allFilteredSelected =
    filteredIds.length > 0 &&
    filteredIds.every((id) => selectedPdfIds.includes(id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportNotice(null);
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const parsed = parseImportedVaultFile(text, file.name);
        if (parsed.length === 0) {
          setImportError('No valid items were found in the imported file.');
          return;
        }
        onImportItems(parsed);
        setImportNotice(`Imported ${parsed.length} item${parsed.length === 1 ? '' : 's'} into vault.`);
        window.setTimeout(() => setImportNotice(null), 4000);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Failed to parse imported file.'
        );
      }
    };
    reader.onerror = () => {
      setImportError('Could not read the selected file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section id="vault" className="max-w-[1320px] mx-auto px-6 py-12">
      {/* Section Header, View Switcher & Search */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-bold text-slate-100">
              Item Vault
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {filteredItems.length} of {items.length} items · Synced to vault database
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Browse uniform cards or switch to the spreadsheet database view. Export
            to Excel (.csv), SQL (.sql), JSON, or cut-ready sleeve PDFs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* View Switcher: Cards vs Excel/Database Table */}
          <div
            role="tablist"
            aria-label="Vault display mode"
            className="inline-flex items-center p-1 rounded-lg bg-[#161920] border border-white/[0.08]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#252A36] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#252A36] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Table / DB
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search
              className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name or stat..."
              aria-label="Filter items in vault"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#161920] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
            />
          </div>
        </div>
      </div>

      {/* Filter & Spreadsheet/Database Action Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div
          role="tablist"
          aria-label="Filter vault by rarity"
          className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-[#161920] border border-white/[0.08] w-fit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={rarityFilter === 'All'}
            onClick={() => setRarityFilter('All')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              rarityFilter === 'All'
                ? 'bg-[#252A36] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({items.length})
          </button>
          {RARITIES.map((r) => {
            const theme = RARITY_THEMES[r];
            const count = items.filter((item) => item.rarity === r).length;
            const active = rarityFilter === r;
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRarityFilter(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#252A36] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-[2px] shrink-0 ${theme.swatchClass}`}
                  aria-hidden="true"
                />
                <span>{r}</span>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multi-Select PDF & Excel/SQL Database Exports */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={handleImportFile}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#161920] border border-white/[0.08] hover:border-white/[0.16] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#D4A853]" />
            Import CSV/JSON
          </button>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => exportVaultToCsv(items)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 bg-[#161920] border border-white/[0.08] hover:border-white/[0.16] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Excel (.csv)
          </button>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => exportVaultToSql(items)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 bg-[#161920] border border-white/[0.08] hover:border-white/[0.16] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            SQL (.sql)
          </button>

          {filteredItems.length > 0 && (
            <button
              type="button"
              onClick={() =>
                allFilteredSelected
                  ? onClearPdfSelection()
                  : onSelectAllFiltered(filteredIds)
              }
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#161920] border border-white/[0.08] hover:border-white/[0.16] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {allFilteredSelected ? 'Clear Selection' : 'Select All'}
            </button>
          )}

          <button
            type="button"
            disabled={selectedPdfIds.length === 0}
            onClick={onExportSelectedPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#D4A853] hover:bg-[#DFB766] disabled:opacity-40 disabled:pointer-events-none text-[#0E1014] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
          >
            <FileDown className="w-3.5 h-3.5" />
            {selectedPdfIds.length > 0
              ? `Export PDF (${selectedPdfIds.length})`
              : 'Export PDF'}
          </button>
        </div>
      </div>

      {importNotice && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200">
          {importNotice}
        </div>
      )}
      {importError && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200">
          {importError}
        </div>
      )}

      {/* Vault Content: Cards View OR Excel/Database Table View */}
      {filteredItems.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedItemId}
                isPdfSelected={selectedPdfIds.includes(item.id)}
                onToggleSelect={onToggleSelectPdf}
                onEdit={onEditItem}
                onExportPdf={onExportSinglePdf}
                onInspectJson={onInspectJson}
                onRemove={onRemoveItem}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#161920] border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#111319] text-[11px] font-semibold text-slate-400">
                    <th className="py-3 px-3 w-10">
                      <button
                        type="button"
                        onClick={() =>
                          allFilteredSelected
                            ? onClearPdfSelection()
                            : onSelectAllFiltered(filteredIds)
                        }
                        aria-label="Toggle select all visible rows"
                        className={`w-4 h-4 rounded-[3px] border flex items-center justify-center cursor-pointer ${
                          allFilteredSelected
                            ? 'bg-[#D4A853] border-[#D4A853] text-[#0E1014]'
                            : 'border-slate-600 bg-[#0E1014]'
                        }`}
                      >
                        {allFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    </th>
                    <th className="py-3 px-3 w-14">Icon</th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer whitespace-nowrap"
                      >
                        Name
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('rarity')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer whitespace-nowrap"
                      >
                        Rarity
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('category')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer whitespace-nowrap"
                      >
                        Category
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('value')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer whitespace-nowrap"
                      >
                        Value
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('weight')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer whitespace-nowrap"
                      >
                        Weight
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-3 min-w-[220px]">Stat Modifiers</th>
                    <th className="py-3 px-3 min-w-[220px]">Effect</th>
                    <th className="py-3 px-3 text-right w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-xs">
                  {filteredItems.map((item) => {
                    const theme = RARITY_THEMES[item.rarity];
                    const checked = selectedPdfIds.includes(item.id);
                    const isActive = item.id === selectedItemId;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-white/[0.03] ${
                          isActive ? 'bg-[#D4A853]/[0.05]' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 align-middle">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`Select ${item.name}`}
                            onClick={() => onToggleSelectPdf(item.id)}
                            className={`w-4 h-4 rounded-[3px] border flex items-center justify-center cursor-pointer ${
                              checked
                                ? 'bg-[#D4A853] border-[#D4A853] text-[#0E1014]'
                                : 'border-slate-600 bg-[#0E1014]'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 align-middle">
                          <div
                            className="w-9 h-9 rounded-md overflow-hidden bg-[#0E1014]"
                            style={{ border: `1px solid ${theme.iconFrameBorder}` }}
                          >
                            <WebpIcon
                              src={item.icon.url}
                              alt={item.name}
                              className="w-full h-full"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-middle">
                          <div className="font-medium text-slate-100 max-w-[210px] truncate">
                            {item.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 truncate max-w-[210px]">
                            {item.requiresAttunement ? 'Attunement · ' : ''}
                            .{item.icon.format}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <span className={`font-semibold ${theme.textClass}`}>
                            {item.rarity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-300 whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                          {item.estimatedValueGp.toLocaleString()} gp
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                          {item.weightLb} lb
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-300">
                          <div
                            title={formatStatsForSpreadsheet(item.statModifiers)}
                            className="max-w-[240px] truncate font-mono text-[11px]"
                          >
                            {item.statModifiers.length > 0
                              ? formatStatsForSpreadsheet(item.statModifiers)
                              : '—'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-400">
                          <div
                            title={item.mechanicsSummary}
                            className="max-w-[240px] truncate"
                          >
                            {item.mechanicsSummary || '—'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              title="Edit item"
                              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#D4A853]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onInspectJson(item)}
                              title="View JSON"
                              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                            >
                              <Code2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onExportSinglePdf(item)}
                              title="Export PDF"
                              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5 text-[#D4A853]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id)}
                              title="Remove item"
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="rounded-xl bg-[#161920] border border-white/[0.08] py-16 px-6 text-center">
          <p className="font-display text-lg font-semibold text-slate-200">
            No Matching Relics Found
          </p>
          <p className="mt-1.5 text-sm text-slate-400">
            {items.length === 0
              ? 'Your vault is empty. Configure an item above and click Generate Item to create one.'
              : 'Adjust your rarity filter or search query to view saved items.'}
          </p>
          {(rarityFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setRarityFilter('All');
                setSearchQuery('');
              }}
              className="mt-5 px-4 py-2 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}
