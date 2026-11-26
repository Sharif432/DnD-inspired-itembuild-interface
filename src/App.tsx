import { useCallback, useEffect, useRef, useState } from 'react';
import { ForgeWorkbench } from './components/ForgeWorkbench';
import { Header } from './components/Header';
import { ItemEditModal } from './components/ItemEditModal';
import { PdfExportModal } from './components/PdfExportModal';
import { VaultGrid } from './components/VaultGrid';
import { BUILTIN_ITEM_ICONS } from './data/icons';
import { STARTER_ITEMS } from './data/starterItems';
import type { DndItem, ItemIconAsset } from './types/item';

const STORAGE_KEY = 'relic-forge-vault-v1';
const ICONS_STORAGE_KEY = 'relic-forge-icons-v1';

function loadInitialItems(): DndItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return STARTER_ITEMS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return STARTER_ITEMS;
  } catch {
    return STARTER_ITEMS;
  }
}

function extractCustomIconsFromItems(
  items: DndItem[],
  existing: ItemIconAsset[]
): ItemIconAsset[] {
  const seenUrls = new Set<string>([
    ...BUILTIN_ITEM_ICONS.map((b) => b.url),
    ...existing.map((e) => e.url),
  ]);
  const added: ItemIconAsset[] = [];

  for (const item of items) {
    if (item.icon?.url && !seenUrls.has(item.icon.url)) {
      seenUrls.add(item.icon.url);
      added.push({
        id: item.icon.id || `custom-${Date.now().toString(36)}`,
        label: item.icon.label || 'Shared Icon',
        url: item.icon.url,
        defaultCategory: item.category,
        format: item.icon.format,
        isCustom: true,
      });
    }
  }

  return added.length > 0 ? [...existing, ...added] : existing;
}

function loadInitialCustomIcons(items: DndItem[]): ItemIconAsset[] {
  let saved: ItemIconAsset[] = [];
  try {
    const raw = localStorage.getItem(ICONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        saved = parsed;
      }
    }
  } catch {
    saved = [];
  }
  return extractCustomIconsFromItems(items, saved);
}

export default function App() {
  const [vaultItems, setVaultItems] = useState<DndItem[]>(loadInitialItems);
  const [customIcons, setCustomIcons] = useState<ItemIconAsset[]>(() =>
    loadInitialCustomIcons(loadInitialItems())
  );
  const [activeItem, setActiveItem] = useState<DndItem | null>(
    () => loadInitialItems()[0] ?? null
  );
  const [outputTab, setOutputTab] = useState<'card' | 'json'>('card');
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);
  const [pdfModalItems, setPdfModalItems] = useState<DndItem[] | null>(null);
  const [editingItem, setEditingItem] = useState<DndItem | null>(null);

  const hasHydratedFromServerRef = useRef(false);

  // Sync with server-side database file (data/vault-db.json) on initial mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/vault');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (Array.isArray(data.items) && data.items.length > 0) {
          setVaultItems(data.items);
          setCustomIcons((prev) => extractCustomIconsFromItems(data.items, prev));
          setActiveItem((prev) => prev ?? data.items[0] ?? null);
        } else {
          // Seed server database with initial items
          await fetch('/api/vault', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: vaultItems }),
          });
        }
      } catch {
        // Offline / localStorage fallback remains active
      } finally {
        hasHydratedFromServerRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist vault items to both localStorage and server database
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vaultItems));
    } catch {
      // Ignore storage quota errors
    }

    if (!hasHydratedFromServerRef.current) return;
    fetch('/api/vault', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: vaultItems }),
    }).catch(() => {
      // Ignore transient background sync error
    });
  }, [vaultItems]);

  // Persist shared custom icon library
  useEffect(() => {
    try {
      localStorage.setItem(ICONS_STORAGE_KEY, JSON.stringify(customIcons));
    } catch {
      // Ignore storage quota errors
    }
  }, [customIcons]);

  const handleAddCustomIcon = useCallback(
    (candidate: ItemIconAsset): ItemIconAsset => {
      const existingBuiltin = BUILTIN_ITEM_ICONS.find(
        (b) => b.url === candidate.url
      );
      if (existingBuiltin) return existingBuiltin;

      const existingCustom = customIcons.find(
        (c) => c.url === candidate.url || c.id === candidate.id
      );
      if (existingCustom) return existingCustom;

      setCustomIcons((prev) => {
        if (prev.some((c) => c.url === candidate.url || c.id === candidate.id)) {
          return prev;
        }
        return [...prev, candidate];
      });
      return candidate;
    },
    [customIcons]
  );

  const handleItemGenerated = (newItem: DndItem) => {
    setVaultItems((prev) => [newItem, ...prev]);
    setActiveItem(newItem);
    setOutputTab('card');
  };

  const handleSaveEditedItem = (updatedItem: DndItem) => {
    setVaultItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    if (activeItem?.id === updatedItem.id) {
      setActiveItem(updatedItem);
    }
  };

  const handleImportItems = (imported: DndItem[]) => {
    setVaultItems((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      for (const item of imported) {
        byId.set(item.id, item);
      }
      return Array.from(byId.values());
    });
    setCustomIcons((prev) => extractCustomIconsFromItems(imported, prev));
  };

  const handleInspectJson = (item: DndItem) => {
    setActiveItem(item);
    setOutputTab('json');
    const el = document.getElementById('output-inspector');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleRemoveItem = (id: string) => {
    setVaultItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeItem?.id === id) {
        setActiveItem(next[0] ?? null);
      }
      return next;
    });
    setSelectedPdfIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const handleToggleSelectPdf = (id: string) => {
    setSelectedPdfIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (ids: string[]) => {
    setSelectedPdfIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearPdfSelection = () => {
    setSelectedPdfIds([]);
  };

  const handleExportSelectedPdf = () => {
    const chosen = vaultItems.filter((item) => selectedPdfIds.includes(item.id));
    if (chosen.length > 0) {
      setPdfModalItems(chosen);
    }
  };

  const handleExportSinglePdf = (item: DndItem) => {
    setPdfModalItems([item]);
  };

  const handleExportVault = () => {
    const payload = JSON.stringify(vaultItems, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relic-forge-vault.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0E1014] text-slate-100 flex flex-col">
      <Header itemCount={vaultItems.length} onExportVault={handleExportVault} />

      <main className="flex-1">
        <ForgeWorkbench
          activeItem={activeItem}
          outputTab={outputTab}
          customIcons={customIcons}
          onAddCustomIcon={handleAddCustomIcon}
          onOutputTabChange={setOutputTab}
          onItemGenerated={handleItemGenerated}
          onEditItem={setEditingItem}
          onExportPdf={handleExportSinglePdf}
        />

        <VaultGrid
          items={vaultItems}
          selectedItemId={activeItem?.id ?? null}
          selectedPdfIds={selectedPdfIds}
          onToggleSelectPdf={handleToggleSelectPdf}
          onSelectAllFiltered={handleSelectAllFiltered}
          onClearPdfSelection={handleClearPdfSelection}
          onExportSelectedPdf={handleExportSelectedPdf}
          onExportSinglePdf={handleExportSinglePdf}
          onEditItem={setEditingItem}
          onInspectJson={handleInspectJson}
          onRemoveItem={handleRemoveItem}
          onImportItems={handleImportItems}
        />
      </main>

      <footer className="border-t border-white/[0.08] py-6 px-6">
        <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Relic Forge · D&amp;D 5e Magical Gear &amp; JSON Item Builder</span>
          <span>
            WebP, SVG &amp; Image Icons · Excel/SQL Database · Card Sleeve PDF
          </span>
        </div>
      </footer>

      <PdfExportModal
        isOpen={pdfModalItems !== null}
        items={pdfModalItems ?? []}
        onClose={() => setPdfModalItems(null)}
      />

      <ItemEditModal
        item={editingItem}
        customIcons={customIcons}
        onAddCustomIcon={handleAddCustomIcon}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditedItem}
      />
    </div>
  );
}
