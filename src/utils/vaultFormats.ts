import type {
  DndItem,
  IconFormat,
  ItemCategory,
  Rarity,
  StatModifier,
} from '../types/item';

const VALID_RARITIES: Rarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
];

const VALID_CATEGORIES: ItemCategory[] = [
  'Weapon',
  'Armor & Shield',
  'Wondrous Item',
  'Ring',
  'Staff & Wand',
  'Potion & Elixir',
  'Tome & Scroll',
];

const VALID_FORMATS: IconFormat[] = ['webp', 'svg', 'png', 'jpg', 'gif', 'avif'];

function escapeCsvCell(value: string | number | boolean | undefined): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatStatsForSpreadsheet(stats: StatModifier[]): string {
  return stats
    .map((s) => {
      const base = `${s.attribute}: ${s.modifier}`;
      return s.note ? `${base} (${s.note})` : base;
    })
    .join(' | ');
}

export function parseStatsFromSpreadsheet(raw: string): StatModifier[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Try JSON array first if user supplied JSON in the cell
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((m) => ({
          attribute: String(m.attribute || 'Bonus'),
          modifier: String(m.modifier || '+1'),
          ...(m.note ? { note: String(m.note) } : {}),
        }));
      }
    } catch {
      // Fall through to pipe-delimited parsing
    }
  }

  return trimmed
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((segment) => {
      const noteMatch = segment.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      const body = noteMatch ? noteMatch[1].trim() : segment;
      const note = noteMatch ? noteMatch[2].trim() : undefined;
      const colonIdx = body.indexOf(':');
      if (colonIdx === -1) {
        return {
          attribute: body || 'Bonus',
          modifier: '+1',
          ...(note ? { note } : {}),
        };
      }
      return {
        attribute: body.slice(0, colonIdx).trim() || 'Bonus',
        modifier: body.slice(colonIdx + 1).trim() || '+1',
        ...(note ? { note } : {}),
      };
    });
}

export function exportVaultToCsv(items: DndItem[]): void {
  const headers = [
    'ID',
    'Name',
    'Rarity',
    'Category',
    'Requires Attunement',
    'Attunement Requirement',
    'Icon ID',
    'Icon Label',
    'Icon Format',
    'Icon URL',
    'Value (gp)',
    'Weight (lb)',
    'Charges Max',
    'Charges Recharge',
    'Stat Modifiers',
    'Effect',
    'Flavor Text',
    'Created At',
  ];

  const rows = items.map((item) =>
    [
      item.id,
      item.name,
      item.rarity,
      item.category,
      item.requiresAttunement ? 'TRUE' : 'FALSE',
      item.attunementRequirement ?? '',
      item.icon.id,
      item.icon.label,
      item.icon.format,
      item.icon.url,
      item.estimatedValueGp,
      item.weightLb,
      item.charges?.max ?? '',
      item.charges?.recharge ?? '',
      formatStatsForSpreadsheet(item.statModifiers),
      item.mechanicsSummary,
      item.flavorText,
      item.createdAt,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  // UTF-8 BOM ensures Microsoft Excel opens columns and special symbols cleanly
  const csvContent = `\uFEFF${headers.join(',')}\r\n${rows.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'relic-forge-vault.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sqlEscape(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function exportVaultToSql(items: DndItem[]): void {
  const schema = [
    '-- Relic Forge Item Vault Database Export',
    `-- Generated ${new Date().toISOString()}`,
    '',
    'CREATE TABLE IF NOT EXISTS dnd_items (',
    '  id TEXT PRIMARY KEY,',
    '  name TEXT NOT NULL,',
    '  rarity TEXT NOT NULL,',
    '  category TEXT NOT NULL,',
    '  requires_attunement BOOLEAN NOT NULL,',
    '  attunement_requirement TEXT,',
    '  icon_id TEXT NOT NULL,',
    '  icon_label TEXT NOT NULL,',
    '  icon_format TEXT NOT NULL,',
    '  icon_url TEXT NOT NULL,',
    '  estimated_value_gp INTEGER NOT NULL,',
    '  weight_lb REAL NOT NULL,',
    '  charges_max INTEGER,',
    '  charges_recharge TEXT,',
    '  stat_modifiers_json TEXT NOT NULL,',
    '  mechanics_summary TEXT NOT NULL,',
    '  flavor_text TEXT NOT NULL,',
    '  created_at TEXT NOT NULL',
    ');',
    '',
  ].join('\n');

  const inserts = items
    .map((item) => {
      const values = [
        sqlEscape(item.id),
        sqlEscape(item.name),
        sqlEscape(item.rarity),
        sqlEscape(item.category),
        item.requiresAttunement ? 'TRUE' : 'FALSE',
        item.attunementRequirement ? sqlEscape(item.attunementRequirement) : 'NULL',
        sqlEscape(item.icon.id),
        sqlEscape(item.icon.label),
        sqlEscape(item.icon.format),
        sqlEscape(item.icon.url),
        String(item.estimatedValueGp),
        String(item.weightLb),
        item.charges ? String(item.charges.max) : 'NULL',
        item.charges ? sqlEscape(item.charges.recharge) : 'NULL',
        sqlEscape(JSON.stringify(item.statModifiers)),
        sqlEscape(item.mechanicsSummary),
        sqlEscape(item.flavorText),
        sqlEscape(item.createdAt),
      ].join(', ');

      return `INSERT INTO dnd_items (id, name, rarity, category, requires_attunement, attunement_requirement, icon_id, icon_label, icon_format, icon_url, estimated_value_gp, weight_lb, charges_max, charges_recharge, stat_modifiers_json, mechanics_summary, flavor_text, created_at) VALUES (${values});`;
    })
    .join('\n');

  const sqlContent = `${schema}${inserts}\n`;
  const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'relic-forge-vault.sql';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseCsvMatrix(raw: string): string[][] {
  const clean = raw.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function parseImportedVaultFile(
  content: string,
  fileName: string
): DndItem[] {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{')) {
    const parsed = JSON.parse(content);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((entry) => entry && typeof entry === 'object' && entry.name)
      .map((entry, idx): DndItem => {
        const rarity = VALID_RARITIES.includes(entry.rarity) ? entry.rarity : 'Rare';
        const category = VALID_CATEGORIES.includes(entry.category)
          ? entry.category
          : 'Wondrous Item';
        const format = VALID_FORMATS.includes(entry.icon?.format)
          ? entry.icon.format
          : 'webp';
        return {
          id:
            typeof entry.id === 'string' && entry.id.trim()
              ? entry.id.trim()
              : `relic-import-${Date.now().toString(36)}-${idx}`,
          name: String(entry.name).trim(),
          rarity,
          category,
          requiresAttunement: Boolean(entry.requiresAttunement),
          ...(entry.attunementRequirement
            ? { attunementRequirement: String(entry.attunementRequirement) }
            : {}),
          icon: {
            id: String(entry.icon?.id || 'longsword'),
            label: String(entry.icon?.label || 'Runed Blade'),
            url: String(entry.icon?.url || '/src/assets/icons/longsword.webp'),
            format,
          },
          flavorText: String(entry.flavorText || ''),
          mechanicsSummary: String(entry.mechanicsSummary || ''),
          statModifiers: Array.isArray(entry.statModifiers)
            ? entry.statModifiers.map((m: Record<string, unknown>) => ({
                attribute: String(m.attribute || 'Bonus'),
                modifier: String(m.modifier || '+1'),
                ...(m.note ? { note: String(m.note) } : {}),
              }))
            : [],
          ...(entry.charges?.max
            ? {
                charges: {
                  max: Number(entry.charges.max) || 1,
                  recharge: String(entry.charges.recharge || 'Dawn'),
                },
              }
            : {}),
          estimatedValueGp: Number(entry.estimatedValueGp) || 0,
          weightLb: Number(entry.weightLb) || 0,
          createdAt: String(entry.createdAt || new Date().toISOString()),
        };
      });
  }

  // CSV Import
  const matrix = parseCsvMatrix(content);
  if (matrix.length < 2) {
    throw new Error('CSV file must include a header row and at least one item row.');
  }

  const headerMap = new Map<string, number>();
  matrix[0].forEach((h, i) => headerMap.set(h.trim().toLowerCase(), i));
  const get = (row: string[], ...keys: string[]) => {
    for (const k of keys) {
      const idx = headerMap.get(k);
      if (idx !== undefined && row[idx] !== undefined) return row[idx].trim();
    }
    return '';
  };

  return matrix.slice(1).map((row, idx): DndItem => {
    const rawName = get(row, 'name', 'item name') || `Imported Relic ${idx + 1}`;
    const rawRarity = get(row, 'rarity') as Rarity;
    const rarity = VALID_RARITIES.includes(rawRarity) ? rawRarity : 'Rare';
    const rawCat = get(row, 'category', 'type') as ItemCategory;
    const category = VALID_CATEGORIES.includes(rawCat) ? rawCat : 'Wondrous Item';
    const rawFmt = get(row, 'icon format', 'format').toLowerCase() as IconFormat;
    const format = VALID_FORMATS.includes(rawFmt) ? rawFmt : 'webp';
    const attuneRaw = get(row, 'requires attunement', 'attunement').toLowerCase();
    const requiresAttunement =
      attuneRaw === 'true' || attuneRaw === 'yes' || attuneRaw === '1';
    const attuneReq = get(row, 'attunement requirement');
    const chargesMax = parseInt(get(row, 'charges max'), 10);
    const chargesRecharge = get(row, 'charges recharge');

    return {
      id:
        get(row, 'id') ||
        `relic-csv-${Date.now().toString(36)}-${idx.toString(36)}`,
      name: rawName,
      rarity,
      category,
      requiresAttunement,
      ...(requiresAttunement && attuneReq
        ? { attunementRequirement: attuneReq }
        : {}),
      icon: {
        id: get(row, 'icon id') || 'longsword',
        label: get(row, 'icon label') || 'Runed Blade',
        url: get(row, 'icon url') || '/src/assets/icons/longsword.webp',
        format,
      },
      flavorText: get(row, 'flavor text', 'flavor'),
      mechanicsSummary: get(row, 'effect', 'mechanics', 'mechanics summary'),
      statModifiers: parseStatsFromSpreadsheet(
        get(row, 'stat modifiers', 'stats')
      ),
      ...(chargesMax > 0
        ? {
            charges: {
              max: chargesMax,
              recharge: chargesRecharge || 'Dawn',
            },
          }
        : {}),
      estimatedValueGp: Number(get(row, 'value (gp)', 'value')) || 0,
      weightLb: Number(get(row, 'weight (lb)', 'weight')) || 0,
      createdAt: get(row, 'created at') || new Date().toISOString(),
    };
  });
}
