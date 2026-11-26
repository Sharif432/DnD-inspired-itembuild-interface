export type Rarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Very Rare'
  | 'Legendary'
  | 'Artifact';

export type ItemCategory =
  | 'Weapon'
  | 'Armor & Shield'
  | 'Wondrous Item'
  | 'Ring'
  | 'Staff & Wand'
  | 'Potion & Elixir'
  | 'Tome & Scroll';

export type IconFormat = 'webp' | 'svg' | 'png' | 'jpg' | 'gif' | 'avif';

export interface ItemIconAsset {
  id: string;
  label: string;
  url: string;
  defaultCategory: ItemCategory;
  format: IconFormat;
  isCustom?: boolean;
}

export interface StatModifier {
  attribute: string;
  modifier: string;
  note?: string;
}

export interface ItemCharges {
  max: number;
  recharge: string;
}

export interface DndItem {
  id: string;
  name: string;
  rarity: Rarity;
  category: ItemCategory;
  requiresAttunement: boolean;
  attunementRequirement?: string;
  icon: {
    id: string;
    label: string;
    url: string;
    format: IconFormat;
  };
  flavorText: string;
  mechanicsSummary: string;
  statModifiers: StatModifier[];
  charges?: ItemCharges;
  estimatedValueGp: number;
  weightLb: number;
  createdAt: string;
}

export interface GenerateItemRequest {
  name: string;
  rarity: Rarity;
  icon: {
    id: string;
    label: string;
    url: string;
    format: IconFormat;
  };
  categoryHint?: ItemCategory | 'Auto';
  themePrompt?: string;
  attunementPreference?: 'auto' | 'required' | 'none';
  customStats?: StatModifier[];
  customEffect?: string;
}
