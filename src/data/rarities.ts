import type { Rarity } from '../types/item';

export interface RarityTheme {
  label: Rarity;
  tierCode: string;
  accentHex: string;
  textClass: string;
  borderStyle: string;
  selectedButtonBg: string;
  cardWashGradient: string;
  iconFrameBorder: string;
  statValueClass: string;
  swatchClass: string;
  powerNotes: string;
}

export const RARITIES: Rarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
];

export const RARITY_THEMES: Record<Rarity, RarityTheme> = {
  Common: {
    label: 'Common',
    tierCode: 'Tier I',
    accentHex: '#94A3B8',
    textClass: 'text-slate-300',
    borderStyle: 'rgba(148, 163, 184, 0.28)',
    selectedButtonBg: 'rgba(148, 163, 184, 0.14)',
    cardWashGradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(148, 163, 184, 0.11) 0%, rgba(22, 25, 32, 0) 70%)',
    iconFrameBorder: 'rgba(148, 163, 184, 0.35)',
    statValueClass: 'text-slate-200',
    swatchClass: 'bg-slate-400',
    powerNotes: 'Minor utility, +0/+1 situational edge, 50–100 gp',
  },
  Uncommon: {
    label: 'Uncommon',
    tierCode: 'Tier II',
    accentHex: '#34D399',
    textClass: 'text-emerald-400',
    borderStyle: 'rgba(52, 211, 153, 0.32)',
    selectedButtonBg: 'rgba(52, 211, 153, 0.13)',
    cardWashGradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(52, 211, 153, 0.12) 0%, rgba(22, 25, 32, 0) 70%)',
    iconFrameBorder: 'rgba(52, 211, 153, 0.42)',
    statValueClass: 'text-emerald-300',
    swatchClass: 'bg-emerald-400',
    powerNotes: '+1 enhancement or signature utility, 101–500 gp',
  },
  Rare: {
    label: 'Rare',
    tierCode: 'Tier III',
    accentHex: '#60A5FA',
    textClass: 'text-blue-400',
    borderStyle: 'rgba(96, 165, 250, 0.36)',
    selectedButtonBg: 'rgba(96, 165, 250, 0.14)',
    cardWashGradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(96, 165, 250, 0.14) 0%, rgba(22, 25, 32, 0) 70%)',
    iconFrameBorder: 'rgba(96, 165, 250, 0.46)',
    statValueClass: 'text-blue-300',
    swatchClass: 'bg-blue-400',
    powerNotes: '+1/+2 bonus, elemental riders or charges, 501–5,000 gp',
  },
  'Very Rare': {
    label: 'Very Rare',
    tierCode: 'Tier IV',
    accentHex: '#C084FC',
    textClass: 'text-purple-400',
    borderStyle: 'rgba(192, 132, 252, 0.38)',
    selectedButtonBg: 'rgba(192, 132, 252, 0.14)',
    cardWashGradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(192, 132, 252, 0.15) 0%, rgba(22, 25, 32, 0) 70%)',
    iconFrameBorder: 'rgba(192, 132, 252, 0.48)',
    statValueClass: 'text-purple-300',
    swatchClass: 'bg-purple-400',
    powerNotes: '+2/+3 enchantment, potent combat & save boons, 5,001–50,000 gp',
  },
  Legendary: {
    label: 'Legendary',
    tierCode: 'Tier V',
    accentHex: '#FBBF24',
    textClass: 'text-amber-400',
    borderStyle: 'rgba(251, 191, 36, 0.42)',
    selectedButtonBg: 'rgba(251, 191, 36, 0.14)',
    cardWashGradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(251, 191, 36, 0.15) 0%, rgba(22, 25, 32, 0) 70%)',
    iconFrameBorder: 'rgba(251, 191, 36, 0.52)',
    statValueClass: 'text-amber-300',
    swatchClass: 'bg-amber-400',
    powerNotes: '+3 pinnacle gear, transformative abilities, 50,000+ gp',
  },
  Artifact: {
    label: 'Artifact',
    tierCode: 'Mythic',
    accentHex: '#F87171',
    textClass: 'text-rose-400',
    borderStyle: 'rgba(248, 113, 113, 0.45)',
    selectedButtonBg: 'rgba(248, 113, 113, 0.15)',
    cardWashGradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(248, 113, 113, 0.16) 0%, rgba(22, 25, 32, 0) 70%)',
    iconFrameBorder: 'rgba(248, 113, 113, 0.55)',
    statValueClass: 'text-rose-300',
    swatchClass: 'bg-rose-400',
    powerNotes: 'Unique world-shaping relic with major & minor properties',
  },
};
