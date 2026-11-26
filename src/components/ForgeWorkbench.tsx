import { useRef, useState } from 'react';
import { AlertCircle, Code2, Dices, Loader2, Upload } from 'lucide-react';
import { BUILTIN_ITEM_ICONS } from '../data/icons';
import { RARITIES, RARITY_THEMES } from '../data/rarities';
import type {
  DndItem,
  IconFormat,
  ItemCategory,
  ItemIconAsset,
  Rarity,
  StatModifier,
} from '../types/item';
import {
  ACCEPTED_ICON_MIME_AND_EXT,
  detectIconFormat,
  parseDataImageUri,
  sanitizeSvgMarkup,
} from '../utils/iconSanitizer';
import { ItemCard } from './ItemCard';
import { JsonBlockViewer } from './JsonBlockViewer';
import { StatModifiersEditor } from './StatModifiersEditor';
import { WebpIcon } from './WebpIcon';

interface ForgeWorkbenchProps {
  activeItem: DndItem | null;
  outputTab: 'card' | 'json';
  customIcons: ItemIconAsset[];
  onAddCustomIcon: (icon: ItemIconAsset) => ItemIconAsset;
  onOutputTabChange: (tab: 'card' | 'json') => void;
  onItemGenerated: (item: DndItem) => void;
  onEditItem: (item: DndItem) => void;
  onExportPdf: (item: DndItem) => void;
}

const CATEGORIES: Array<ItemCategory | 'Auto'> = [
  'Auto',
  'Weapon',
  'Armor & Shield',
  'Wondrous Item',
  'Ring',
  'Staff & Wand',
  'Potion & Elixir',
  'Tome & Scroll',
];

export function ForgeWorkbench({
  activeItem,
  outputTab,
  customIcons,
  onAddCustomIcon,
  onOutputTabChange,
  onItemGenerated,
  onEditItem,
  onExportPdf,
}: ForgeWorkbenchProps) {
  const [name, setName] = useState('Oathkeeper Longsword');
  const [rarity, setRarity] = useState<Rarity>('Rare');
  const [selectedIconId, setSelectedIconId] = useState<string>(
    BUILTIN_ITEM_ICONS[0].id
  );
  const [iconFormatFilter, setIconFormatFilter] = useState<'all' | 'webp' | 'svg'>('all');
  const [showPasteIconPanel, setShowPasteIconPanel] = useState(false);
  const [pastedIconLabel, setPastedIconLabel] = useState('');
  const [pastedIconSource, setPastedIconSource] = useState('');
  const [categoryHint, setCategoryHint] = useState<ItemCategory | 'Auto'>('Auto');
  const [attunementPref, setAttunementPref] = useState<'auto' | 'required' | 'none'>(
    'auto'
  );
  const [themePrompt, setThemePrompt] = useState('');
  const [statsMode, setStatsMode] = useState<'auto' | 'custom'>('auto');
  const [customStats, setCustomStats] = useState<StatModifier[]>([
    { attribute: 'Weapon Damage', modifier: '1d8+1 Slashing', note: 'Melee attack' },
  ]);
  const [customEffect, setCustomEffect] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasForgedCurrentConfig, setHasForgedCurrentConfig] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allIcons = [...BUILTIN_ITEM_ICONS, ...customIcons];
  const visibleIcons = allIcons.filter((icon) => {
    if (icon.isCustom) return true;
    if (iconFormatFilter === 'all') return true;
    return icon.format === iconFormatFilter;
  });
  const selectedIcon =
    allIcons.find((icon) => icon.id === selectedIconId) ?? BUILTIN_ITEM_ICONS[0];
  const activeRarityTheme = RARITY_THEMES[rarity];

  const handleIconFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const detectedFormat: IconFormat | null = detectIconFormat(
      file.type,
      file.name
    );
    if (!detectedFormat) {
      setUploadError(
        'Unsupported image type. Use .webp, .svg, .png, .jpg, .gif, or .avif.'
      );
      event.target.value = '';
      return;
    }

    if (file.size > 1024 * 1024 * 2) {
      setUploadError('Icon image file must be under 2 MB.');
      event.target.value = '';
      return;
    }

    const cleanName =
      file.name.replace(/\.(webp|svg|png|jpe?g|gif|avif)$/i, '').slice(0, 20) ||
      'Custom Icon';

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          setUploadError('Could not read the selected image file.');
          return;
        }
        const finalUrl =
          detectedFormat === 'svg' ? sanitizeSvgMarkup(result) : result;

        const savedIcon = onAddCustomIcon({
          id: `custom-${Date.now().toString(36)}`,
          label: cleanName,
          url: finalUrl,
          defaultCategory: 'Wondrous Item',
          format: detectedFormat,
          isCustom: true,
        });
        setSelectedIconId(savedIcon.id);
        setHasForgedCurrentConfig(false);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Invalid SVG or image asset.'
        );
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read the icon asset.');
    };

    if (detectedFormat === 'svg') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const handleAddPastedIcon = () => {
    setUploadError(null);
    const raw = pastedIconSource.trim();
    if (!raw) {
      setUploadError('Paste raw <svg> markup or a data:image/... URI.');
      return;
    }

    try {
      let url = '';
      let format: IconFormat = 'svg';
      if (raw.toLowerCase().startsWith('data:image/')) {
        const parsed = parseDataImageUri(raw);
        url = parsed.url;
        format = parsed.format;
      } else {
        url = sanitizeSvgMarkup(raw);
        format = 'svg';
      }

      const savedIcon = onAddCustomIcon({
        id: `custom-${Date.now().toString(36)}`,
        label: pastedIconLabel.trim().slice(0, 20) || `Custom ${format.toUpperCase()}`,
        url,
        defaultCategory: 'Wondrous Item',
        format,
        isCustom: true,
      });
      setSelectedIconId(savedIcon.id);
      setPastedIconSource('');
      setPastedIconLabel('');
      setShowPasteIconPanel(false);
      setHasForgedCurrentConfig(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not parse pasted icon data.'
      );
    }
  };

  const handleSuggestName = async () => {
    setErrorMessage(null);
    setIsSuggestingName(true);
    try {
      const response = await fetch('/api/items/suggest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rarity,
          iconLabel: selectedIcon.label,
          themePrompt: themePrompt.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not suggest an item name.');
      }
      setName(data.name);
      setHasForgedCurrentConfig(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not suggest an item name.'
      );
    } finally {
      setIsSuggestingName(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Enter an item name before generating the JSON item block.');
      return;
    }

    setIsGenerating(true);
    try {
      const preparedCustomStats =
        statsMode === 'custom'
          ? customStats
              .map((s) => ({
                attribute: s.attribute.trim(),
                modifier: s.modifier.trim(),
                ...(s.note && s.note.trim() ? { note: s.note.trim() } : {}),
              }))
              .filter((s) => s.attribute || s.modifier)
          : undefined;

      const response = await fetch('/api/items/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rarity,
          icon: {
            id: selectedIcon.id,
            label: selectedIcon.label,
            url: selectedIcon.url,
            format: selectedIcon.format,
          },
          categoryHint,
          themePrompt: themePrompt.trim(),
          attunementPreference: attunementPref,
          ...(preparedCustomStats && preparedCustomStats.length > 0
            ? { customStats: preparedCustomStats }
            : {}),
          ...(customEffect.trim() ? { customEffect: customEffect.trim() } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Item generation failed.');
      }

      onItemGenerated(data.item);
      setHasForgedCurrentConfig(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Item generation failed.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Build live preview card reflecting the user's current selections before/until generated
  const previewCardItem: DndItem = {
    id: 'preview-pending',
    name: name.trim() || 'Unnamed Relic',
    rarity,
    category:
      categoryHint === 'Auto' ? selectedIcon.defaultCategory : categoryHint,
    requiresAttunement: attunementPref === 'required',
    icon: {
      id: selectedIcon.id,
      label: selectedIcon.label,
      url: selectedIcon.url,
      format: selectedIcon.format,
    },
    flavorText: themePrompt.trim()
      ? `"${themePrompt.trim()}"`
      : `Selected ${rarity.toLowerCase()} relic forged with the ${selectedIcon.label} (.${selectedIcon.format}) icon. Generate to craft full lore and stat modifiers.`,
    mechanicsSummary:
      customEffect.trim() ||
      'Stat modifiers, charges, and JSON item schema populate upon generation.',
    statModifiers:
      statsMode === 'custom'
        ? customStats.filter((s) => s.attribute.trim() || s.modifier.trim())
        : [
            { attribute: 'Rarity Tier', modifier: activeRarityTheme.tierCode },
            {
              attribute: 'Icon Asset',
              modifier: `${selectedIcon.id}.${selectedIcon.format}`,
            },
            { attribute: 'Schema Status', modifier: 'Ready' },
          ],
    estimatedValueGp: 0,
    weightLb: 0,
    createdAt: new Date().toISOString(),
  };

  const displayedItem =
    hasForgedCurrentConfig || !activeItem
      ? activeItem ?? previewCardItem
      : activeItem;

  // If user is actively editing name/rarity/icon after inspecting another item,
  // show live preview unless they just clicked View JSON from the vault
  const cardToDisplay =
    !hasForgedCurrentConfig && activeItem && outputTab === 'card'
      ? previewCardItem
      : displayedItem;

  return (
    <section
      id="forge"
      className="max-w-[1320px] mx-auto px-6 pt-10 pb-12 border-b border-white/[0.08]"
    >
      {/* Editorial Intro */}
      <div className="max-w-2xl mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
          Forge Magical Gear &amp; JSON Item Blocks
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-slate-400">
          Choose a WebP, SVG, or custom picture icon, set the rarity tier, and name
          your relic. Generate balanced stat modifiers, custom lore text, and a
          uniform card ready for JSON or card-sleeve PDF export.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Configurator Form (7 cols) */}
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-7 rounded-xl bg-[#161920] border border-white/[0.08] p-6 flex flex-col justify-between gap-6"
        >
          <div className="space-y-6">
            {/* Step 1: Item Name */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="item-name-input"
                  className="text-sm font-medium text-slate-200"
                >
                  Item Name
                </label>
                <button
                  type="button"
                  onClick={handleSuggestName}
                  disabled={isSuggestingName || isGenerating}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4A853] hover:text-[#E5BE71] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                >
                  {isSuggestingName ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Dices className="w-3.5 h-3.5" />
                  )}
                  Suggest Name
                </button>
              </div>
              <input
                id="item-name-input"
                type="text"
                value={name}
                maxLength={64}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasForgedCurrentConfig(false);
                }}
                placeholder="e.g., Ashwind Greatsword"
                className="w-full h-11 px-3.5 rounded-lg bg-[#0E1014] border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853] transition-colors"
              />
            </div>

            {/* Step 2: Rarity Level */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-slate-200">
                  Rarity Level
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {activeRarityTheme.powerNotes}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="Item rarity level"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
              >
                {RARITIES.map((r) => {
                  const rTheme = RARITY_THEMES[r];
                  const selected = rarity === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setRarity(r);
                        setHasForgedCurrentConfig(false);
                      }}
                      className="h-11 px-3 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                      style={{
                        backgroundColor: selected
                          ? rTheme.selectedButtonBg
                          : '#0E1014',
                        borderColor: selected
                          ? rTheme.accentHex
                          : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-sm shrink-0 ${rTheme.swatchClass}`}
                          aria-hidden="true"
                        />
                        <span
                          className={`text-xs font-semibold truncate ${
                            selected ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {r}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {rTheme.tierCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Item Icon Asset Selector (WebP, SVG, PNG, JPG, GIF, AVIF) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-200">
                    Item Icon
                  </span>
                  <div
                    role="tablist"
                    aria-label="Filter built-in icons by picture format"
                    className="inline-flex items-center p-0.5 rounded-md bg-[#0E1014] border border-white/[0.08]"
                  >
                    {(['all', 'webp', 'svg'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        role="tab"
                        aria-selected={iconFormatFilter === fmt}
                        onClick={() => setIconFormatFilter(fmt)}
                        className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer uppercase ${
                          iconFormatFilter === fmt
                            ? 'bg-[#252A36] text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasteIconPanel((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#D4A853]" />
                    Paste SVG / URI
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_ICON_MIME_AND_EXT}
                    onChange={handleIconFileUpload}
                    className="sr-only"
                    id="custom-icon-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D4A853]" />
                    Upload Icon
                  </button>
                </div>
              </div>

              {showPasteIconPanel && (
                <div className="mb-3 p-3 rounded-lg bg-[#0E1014] border border-white/[0.1] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300">
                      Paste SVG Markup or Data Image URI
                    </span>
                    <input
                      type="text"
                      value={pastedIconLabel}
                      onChange={(e) => setPastedIconLabel(e.target.value)}
                      placeholder="Label (optional)"
                      maxLength={20}
                      className="h-7 px-2.5 rounded-md bg-[#161920] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853] w-36"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={pastedIconSource}
                    onChange={(e) => setPastedIconSource(e.target.value)}
                    placeholder="<svg viewBox='0 0 256 256'>...</svg> or data:image/png;base64,..."
                    className="w-full p-2.5 rounded-md bg-[#161920] border border-white/[0.08] font-mono text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteIconPanel(false)}
                      className="px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPastedIcon}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-[#D4A853] hover:bg-[#DFB766] text-[#0E1014] cursor-pointer"
                    >
                      Add Icon
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="mb-2 text-xs text-rose-400">{uploadError}</p>
              )}

              <div className="grid grid-cols-4 gap-2.5">
                {visibleIcons.map((icon) => {
                  const selected = icon.id === selectedIcon.id;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => {
                        setSelectedIconId(icon.id);
                        setHasForgedCurrentConfig(false);
                      }}
                      className="p-2 rounded-lg border bg-[#0E1014] flex flex-col items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
                      style={{
                        borderColor: selected
                          ? activeRarityTheme.accentHex
                          : 'rgba(255,255,255,0.08)',
                        backgroundColor: selected
                          ? activeRarityTheme.selectedButtonBg
                          : '#0E1014',
                      }}
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-[#14171E] border border-white/[0.06]">
                        <WebpIcon
                          src={icon.url}
                          alt={icon.label}
                          className="w-full h-full"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-300 truncate max-w-full">
                        {icon.label}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 leading-none">
                        .{icon.format}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label
                  htmlFor="category-select"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Item Type
                </label>
                <select
                  id="category-select"
                  value={categoryHint}
                  onChange={(e) => {
                    setCategoryHint(e.target.value as ItemCategory | 'Auto');
                    setHasForgedCurrentConfig(false);
                  }}
                  className="w-full h-10 px-3 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-[#D4A853]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'Auto' ? 'Auto (from icon)' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="attunement-select"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Attunement
                </label>
                <select
                  id="attunement-select"
                  value={attunementPref}
                  onChange={(e) => {
                    setAttunementPref(
                      e.target.value as 'auto' | 'required' | 'none'
                    );
                    setHasForgedCurrentConfig(false);
                  }}
                  className="w-full h-10 px-3 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-[#D4A853]"
                >
                  <option value="auto">Auto by rarity</option>
                  <option value="required">Requires attunement</option>
                  <option value="none">No attunement</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="theme-note"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Theme Note (Optional)
                </label>
                <input
                  id="theme-note"
                  type="text"
                  value={themePrompt}
                  maxLength={100}
                  onChange={(e) => {
                    setThemePrompt(e.target.value);
                    setHasForgedCurrentConfig(false);
                  }}
                  placeholder="e.g., Frost giant silver"
                  className="w-full h-10 px-3 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
                />
              </div>
            </div>

            {/* Step 4: Custom Stats & Effect */}
            <div className="pt-2 border-t border-white/[0.07] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Stats &amp; Effect
                </span>
                <div className="flex items-center gap-2">
                  <div
                    role="tablist"
                    aria-label="Stat generation mode"
                    className="inline-flex items-center p-0.5 rounded-md bg-[#0E1014] border border-white/[0.08]"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={statsMode === 'auto'}
                      onClick={() => {
                        setStatsMode('auto');
                        setHasForgedCurrentConfig(false);
                      }}
                      className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer ${
                        statsMode === 'auto'
                          ? 'bg-[#252A36] text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Auto by AI
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={statsMode === 'custom'}
                      onClick={() => {
                        setStatsMode('custom');
                        setHasForgedCurrentConfig(false);
                      }}
                      className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer ${
                        statsMode === 'custom'
                          ? 'bg-[#252A36] text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Custom Stats
                    </button>
                  </div>
                </div>
              </div>

              {statsMode === 'custom' && (
                <div className="p-3 rounded-lg bg-[#0E1014]/60 border border-white/[0.08]">
                  <StatModifiersEditor
                    stats={customStats}
                    onChange={(next) => {
                      setCustomStats(next);
                      setHasForgedCurrentConfig(false);
                    }}
                    maxStats={8}
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="custom-effect-input"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Custom Effect (Optional — leave blank for AI effect)
                </label>
                <input
                  id="custom-effect-input"
                  type="text"
                  value={customEffect}
                  maxLength={220}
                  onChange={(e) => {
                    setCustomEffect(e.target.value);
                    setHasForgedCurrentConfig(false);
                  }}
                  placeholder="e.g., Deals an extra 1d6 radiant damage against undead."
                  className="w-full h-10 px-3 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
                />
              </div>
            </div>
          </div>

          {/* Error Banner + Generate CTA */}
          <div className="space-y-3 pt-2 border-t border-white/[0.07]">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400 truncate">
                <span className={activeRarityTheme.textClass}>{rarity}</span>
                <span className="mx-1.5 text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span>
                  {selectedIcon.label} (.{selectedIcon.format})
                </span>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="h-11 px-6 rounded-lg text-sm font-semibold bg-[#D4A853] hover:bg-[#DFB766] disabled:opacity-60 text-[#0E1014] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
              >
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Item'}
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Card Preview & JSON Item Block Output (5 cols) */}
        <div
          id="output-inspector"
          className="lg:col-span-5 rounded-xl bg-[#161920] border border-white/[0.08] p-6 flex flex-col items-center justify-between gap-5"
        >
          {/* Output View Segmented Switcher */}
          <div className="w-full flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 truncate">
              {outputTab === 'json'
                ? 'Final JSON Item Block'
                : !hasForgedCurrentConfig
                ? 'Configuration Preview'
                : 'Generated Item Card'}
            </div>

            <div
              role="tablist"
              aria-label="Output format"
              className="inline-flex items-center p-1 rounded-lg bg-[#0E1014] border border-white/[0.08] shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={outputTab === 'card'}
                onClick={() => onOutputTabChange('card')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  outputTab === 'card'
                    ? 'bg-[#222733] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Item Card
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={outputTab === 'json'}
                onClick={() => onOutputTabChange('json')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  outputTab === 'json'
                    ? 'bg-[#222733] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JSON Block
              </button>
            </div>
          </div>

          {/* Uniform 390px Card or JSON Viewer */}
          <div className="w-full max-w-[390px] mx-auto flex-1 flex items-center justify-center">
            {outputTab === 'card' ? (
              <ItemCard
                item={cardToDisplay}
                isPreview={!hasForgedCurrentConfig}
                centerContent
                onEdit={!hasForgedCurrentConfig ? undefined : onEditItem}
                onInspectJson={() => onOutputTabChange('json')}
                onExportPdf={!hasForgedCurrentConfig ? undefined : onExportPdf}
              />
            ) : (
              <JsonBlockViewer
                item={activeItem ?? previewCardItem}
                onExportPdf={onExportPdf}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
