import { useEffect, useRef, useState } from 'react';
import { Save, Upload, X } from 'lucide-react';
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
  sanitizeSvgMarkup,
} from '../utils/iconSanitizer';
import { StatModifiersEditor } from './StatModifiersEditor';
import { WebpIcon } from './WebpIcon';

interface ItemEditModalProps {
  item: DndItem | null;
  customIcons: ItemIconAsset[];
  onAddCustomIcon: (icon: ItemIconAsset) => ItemIconAsset;
  onClose: () => void;
  onSave: (updated: DndItem) => void;
}

const CATEGORIES: ItemCategory[] = [
  'Weapon',
  'Armor & Shield',
  'Wondrous Item',
  'Ring',
  'Staff & Wand',
  'Potion & Elixir',
  'Tome & Scroll',
];

export function ItemEditModal({
  item,
  customIcons,
  onAddCustomIcon,
  onClose,
  onSave,
}: ItemEditModalProps) {
  const [name, setName] = useState('');
  const [rarity, setRarity] = useState<Rarity>('Rare');
  const [category, setCategory] = useState<ItemCategory>('Weapon');
  const [requiresAttunement, setRequiresAttunement] = useState(false);
  const [attunementRequirement, setAttunementRequirement] = useState('');
  const [flavorText, setFlavorText] = useState('');
  const [mechanicsSummary, setMechanicsSummary] = useState('');
  const [statModifiers, setStatModifiers] = useState<StatModifier[]>([]);
  const [hasCharges, setHasCharges] = useState(false);
  const [chargeMax, setChargeMax] = useState(3);
  const [chargeRecharge, setChargeRecharge] = useState('Dawn');
  const [estimatedValueGp, setEstimatedValueGp] = useState(100);
  const [weightLb, setWeightLb] = useState(1);
  const [selectedIcon, setSelectedIcon] = useState<{
    id: string;
    label: string;
    url: string;
    format: IconFormat;
  }>({
    id: BUILTIN_ITEM_ICONS[0].id,
    label: BUILTIN_ITEM_ICONS[0].label,
    url: BUILTIN_ITEM_ICONS[0].url,
    format: BUILTIN_ITEM_ICONS[0].format,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setRarity(item.rarity);
    setCategory(item.category);
    setRequiresAttunement(item.requiresAttunement);
    setAttunementRequirement(item.attunementRequirement ?? '');
    setFlavorText(item.flavorText);
    setMechanicsSummary(item.mechanicsSummary);
    setStatModifiers(item.statModifiers.map((m) => ({ ...m })));
    setHasCharges(Boolean(item.charges));
    setChargeMax(item.charges?.max ?? 3);
    setChargeRecharge(item.charges?.recharge ?? 'Dawn');
    setEstimatedValueGp(item.estimatedValueGp);
    setWeightLb(item.weightLb);
    setSelectedIcon({ ...item.icon });
    setUploadError(null);
    setValidationError(null);

    const isBuiltin = BUILTIN_ITEM_ICONS.some((b) => b.id === item.icon.id);
    const isKnownCustom = customIcons.some(
      (c) => c.id === item.icon.id || c.url === item.icon.url
    );
    if (!isBuiltin && !isKnownCustom && item.icon.url) {
      onAddCustomIcon({
        id: item.icon.id,
        label: item.icon.label,
        url: item.icon.url,
        defaultCategory: item.category,
        format: item.icon.format,
        isCustom: true,
      });
    }
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const iconChoices = [...BUILTIN_ITEM_ICONS, ...customIcons];

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const format = detectIconFormat(file.type, file.name);
    if (!format) {
      setUploadError('Use .webp, .svg, .png, .jpg, .gif, or .avif.');
      e.target.value = '';
      return;
    }

    const cleanLabel =
      file.name.replace(/\.(webp|svg|png|jpe?g|gif|avif)$/i, '').slice(0, 20) ||
      'Custom Icon';

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) return;
        const url = format === 'svg' ? sanitizeSvgMarkup(result) : result;
        const savedIcon = onAddCustomIcon({
          id: `custom-${Date.now().toString(36)}`,
          label: cleanLabel,
          url,
          defaultCategory: category,
          format,
          isCustom: true,
        });
        setSelectedIcon({
          id: savedIcon.id,
          label: savedIcon.label,
          url: savedIcon.url,
          format: savedIcon.format,
        });
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Invalid image asset.'
        );
      }
    };
    if (format === 'svg') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Item name cannot be empty.');
      return;
    }

    const cleanStats = statModifiers
      .map((s) => ({
        attribute: s.attribute.trim(),
        modifier: s.modifier.trim(),
        ...(s.note && s.note.trim() ? { note: s.note.trim() } : {}),
      }))
      .filter((s) => s.attribute || s.modifier)
      .map((s) => ({
        attribute: s.attribute || 'Bonus',
        modifier: s.modifier || '+1',
        ...(s.note ? { note: s.note } : {}),
      }));

    const updated: DndItem = {
      ...item,
      name: name.trim(),
      rarity,
      category,
      requiresAttunement,
      ...(requiresAttunement && attunementRequirement.trim()
        ? { attunementRequirement: attunementRequirement.trim() }
        : { attunementRequirement: undefined }),
      icon: selectedIcon,
      flavorText: flavorText.trim(),
      mechanicsSummary: mechanicsSummary.trim(),
      statModifiers: cleanStats,
      ...(hasCharges && chargeMax > 0
        ? {
            charges: {
              max: Math.max(1, Math.floor(chargeMax)),
              recharge: chargeRecharge.trim() || 'Dawn',
            },
          }
        : { charges: undefined }),
      estimatedValueGp: Math.max(0, Number(estimatedValueGp) || 0),
      weightLb: Math.max(0, Number(weightLb) || 0),
    };

    if (!updated.attunementRequirement) delete updated.attunementRequirement;
    if (!updated.charges) delete updated.charges;

    onSave(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-item-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-xl bg-[#161920] border border-white/[0.12] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2
              id="edit-item-title"
              className="font-display text-lg font-semibold text-slate-100"
            >
              Edit Vault Item
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{item.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item editor"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label
                htmlFor="edit-item-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Item Name
              </label>
              <input
                id="edit-item-name"
                type="text"
                value={name}
                maxLength={64}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0E1014] border border-white/[0.1] text-sm text-slate-100 focus:outline-none focus:border-[#D4A853]"
              />
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="edit-item-rarity"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Rarity
              </label>
              <select
                id="edit-item-rarity"
                value={rarity}
                onChange={(e) => setRarity(e.target.value as Rarity)}
                className="w-full h-10 px-3 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-[#D4A853]"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="edit-item-category"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Category
              </label>
              <select
                id="edit-item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full h-10 px-3 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-[#D4A853]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-300">
                Item Icon (.{selectedIcon.format})
              </span>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_ICON_MIME_AND_EXT}
                  onChange={handleIconUpload}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4A853] hover:text-[#E5BE71] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Icon
                </button>
              </div>
            </div>
            {uploadError && (
              <p className="text-xs text-rose-400 mb-2">{uploadError}</p>
            )}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {iconChoices.map((ic) => {
                const active = ic.id === selectedIcon.id;
                const theme = RARITY_THEMES[rarity];
                return (
                  <button
                    key={ic.id}
                    type="button"
                    title={`${ic.label} (.${ic.format})`}
                    onClick={() =>
                      setSelectedIcon({
                        id: ic.id,
                        label: ic.label,
                        url: ic.url,
                        format: ic.format,
                      })
                    }
                    className="p-1.5 rounded-lg border bg-[#0E1014] flex flex-col items-center gap-1 cursor-pointer transition-colors"
                    style={{
                      borderColor: active
                        ? theme.accentHex
                        : 'rgba(255,255,255,0.08)',
                      backgroundColor: active
                        ? theme.selectedButtonBg
                        : '#0E1014',
                    }}
                  >
                    <div className="w-9 h-9 rounded overflow-hidden bg-[#14171E]">
                      <WebpIcon
                        src={ic.url}
                        alt={ic.label}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="font-mono text-[9px] text-slate-400 leading-none">
                      .{ic.format}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flavor & Effect */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-flavor-text"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Flavor Text
              </label>
              <textarea
                id="edit-flavor-text"
                rows={3}
                value={flavorText}
                onChange={(e) => setFlavorText(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-[#D4A853]"
              />
            </div>

            <div>
              <label
                htmlFor="edit-mechanics-summary"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Item Effect / Mechanics
              </label>
              <textarea
                id="edit-mechanics-summary"
                rows={3}
                value={mechanicsSummary}
                onChange={(e) => setMechanicsSummary(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-[#D4A853]"
              />
            </div>
          </div>

          {/* Stat Modifiers Editor */}
          <StatModifiersEditor
            stats={statModifiers}
            onChange={setStatModifiers}
            maxStats={8}
          />

          {/* Value, Weight, Attunement, Charges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label
                htmlFor="edit-value-gp"
                className="block text-xs font-medium text-slate-400 mb-1"
              >
                Value (gp)
              </label>
              <input
                id="edit-value-gp"
                type="number"
                min={0}
                value={estimatedValueGp}
                onChange={(e) =>
                  setEstimatedValueGp(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full h-9 px-2.5 rounded-lg bg-[#0E1014] border border-white/[0.1] font-mono text-xs text-slate-100 tabular-nums focus:outline-none focus:border-[#D4A853]"
              />
            </div>

            <div>
              <label
                htmlFor="edit-weight-lb"
                className="block text-xs font-medium text-slate-400 mb-1"
              >
                Weight (lb)
              </label>
              <input
                id="edit-weight-lb"
                type="number"
                min={0}
                step={0.5}
                value={weightLb}
                onChange={(e) =>
                  setWeightLb(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full h-9 px-2.5 rounded-lg bg-[#0E1014] border border-white/[0.1] font-mono text-xs text-slate-100 tabular-nums focus:outline-none focus:border-[#D4A853]"
              />
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setRequiresAttunement((v) => !v)}
                className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  requiresAttunement
                    ? 'bg-[#D4A853]/12 border-[#D4A853] text-white'
                    : 'bg-[#0E1014] border-white/[0.1] text-slate-400'
                }`}
              >
                <span>Attunement</span>
                <span className="font-mono text-[11px]">
                  {requiresAttunement ? 'YES' : 'NO'}
                </span>
              </button>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setHasCharges((v) => !v)}
                className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  hasCharges
                    ? 'bg-[#D4A853]/12 border-[#D4A853] text-white'
                    : 'bg-[#0E1014] border-white/[0.1] text-slate-400'
                }`}
              >
                <span>Charges</span>
                <span className="font-mono text-[11px]">
                  {hasCharges ? 'YES' : 'NO'}
                </span>
              </button>
            </div>
          </div>

          {(requiresAttunement || hasCharges) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {requiresAttunement && (
                <div>
                  <label
                    htmlFor="edit-attune-req"
                    className="block text-xs font-medium text-slate-400 mb-1"
                  >
                    Attunement Requirement
                  </label>
                  <input
                    id="edit-attune-req"
                    type="text"
                    value={attunementRequirement}
                    onChange={(e) => setAttunementRequirement(e.target.value)}
                    placeholder="e.g., Spellcaster or Paladin"
                    className="w-full h-9 px-2.5 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
                  />
                </div>
              )}

              {hasCharges && (
                <>
                  <div>
                    <label
                      htmlFor="edit-charge-max"
                      className="block text-xs font-medium text-slate-400 mb-1"
                    >
                      Max Charges
                    </label>
                    <input
                      id="edit-charge-max"
                      type="number"
                      min={1}
                      max={99}
                      value={chargeMax}
                      onChange={(e) =>
                        setChargeMax(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-full h-9 px-2.5 rounded-lg bg-[#0E1014] border border-white/[0.1] font-mono text-xs text-slate-100 tabular-nums focus:outline-none focus:border-[#D4A853]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-charge-recharge"
                      className="block text-xs font-medium text-slate-400 mb-1"
                    >
                      Recharge Timing
                    </label>
                    <input
                      id="edit-charge-recharge"
                      type="text"
                      value={chargeRecharge}
                      onChange={(e) => setChargeRecharge(e.target.value)}
                      placeholder="e.g., 1d3 at dawn"
                      className="w-full h-9 px-2.5 rounded-lg bg-[#0E1014] border border-white/[0.1] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {validationError && (
            <p className="text-xs text-rose-400">{validationError}</p>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-[#D4A853] hover:bg-[#DFB766] text-[#0E1014] transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
