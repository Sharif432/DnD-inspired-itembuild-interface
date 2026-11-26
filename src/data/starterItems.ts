import type { DndItem } from '../types/item';

export const STARTER_ITEMS: DndItem[] = [
  {
    id: 'relic-dawn-ward-shield',
    name: 'Aegis of the First Bastion',
    rarity: 'Rare',
    category: 'Armor & Shield',
    requiresAttunement: true,
    attunementRequirement: 'Any creature proficient with shields',
    icon: {
      id: 'aegis_shield',
      label: 'Kite Shield',
      url: '/src/assets/icons/aegis_shield.webp',
      format: 'webp',
    },
    flavorText:
      'Beaten from fallen star-iron and edged in watchtower bronze, its eagle crest warms whenever an ally nearby draws breath in peril.',
    mechanicsSummary:
      'Grants +2 AC in addition to a normal shield bonus. Once per dawn, expend 1 charge as a reaction to grant an adjacent ally half cover.',
    statModifiers: [
      { attribute: 'Armor Class', modifier: '+2', note: 'Stacks with base shield' },
      { attribute: 'DEX Saves', modifier: '+1', note: 'Against breath & spell blasts' },
      { attribute: 'Damage Ward', modifier: '1d8', note: 'Reaction damage reduction' },
    ],
    charges: {
      max: 3,
      recharge: '1d3 at dawn',
    },
    estimatedValueGp: 3200,
    weightLb: 6,
    createdAt: '2026-11-16T20:00:00.000Z',
  },
  {
    id: 'relic-starweave-tome',
    name: 'Codex of the Sunken Astrolabe',
    rarity: 'Legendary',
    category: 'Tome & Scroll',
    requiresAttunement: true,
    attunementRequirement: 'Wizard, Sorcerer, or Warlock',
    icon: {
      id: 'grimoire_tome',
      label: 'Astrolabe Tome',
      url: '/src/assets/icons/grimoire_tome.webp',
      format: 'webp',
    },
    flavorText:
      'The brass astrolabe inset in its spine turns silently to match constellations unseen above the clouds, whispering forgotten planar coordinates.',
    mechanicsSummary:
      'Serves as a spellcasting focus granting +3 to spell attacks and save DC. Lets you cast Contact Other Plane once per long rest without strain.',
    statModifiers: [
      { attribute: 'Spell Attack', modifier: '+3', note: 'Arcane focus bonus' },
      { attribute: 'Spell Save DC', modifier: '+3', note: 'All prepared spells' },
      { attribute: 'Arcana Checks', modifier: '+4', note: 'Celestial & planar lore' },
    ],
    charges: {
      max: 5,
      recharge: 'Midnight under open sky',
    },
    estimatedValueGp: 65000,
    weightLb: 3.5,
    createdAt: '2026-11-16T20:05:00.000Z',
  },
  {
    id: 'relic-verdant-draught',
    name: 'Vial of Mossbound Vitality',
    rarity: 'Uncommon',
    category: 'Potion & Elixir',
    requiresAttunement: false,
    icon: {
      id: 'elixir_flask',
      label: 'Elixir Flask',
      url: '/src/assets/icons/elixir_flask.webp',
      format: 'webp',
    },
    flavorText:
      'Distilled from deep-fen glowcap spores and winter springwater, a single draught leaves the taste of crushed pine and steady thunder in the pulse.',
    mechanicsSummary:
      'Drinking as a bonus action restores hit points and grants temporary immunity to the poisoned condition for 1 hour.',
    statModifiers: [
      { attribute: 'Hit Points', modifier: '4d4+4', note: 'Immediate restoration' },
      { attribute: 'CON Saves', modifier: '+2', note: 'For 1 hour vs. poison' },
      { attribute: 'Temp HP', modifier: '+6', note: 'Lasts until short rest' },
    ],
    estimatedValueGp: 275,
    weightLb: 0.5,
    createdAt: '2026-11-16T20:10:00.000Z',
  },
];
