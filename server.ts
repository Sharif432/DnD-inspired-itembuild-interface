import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add a valid key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getGeminiErrorStatus(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  if (rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('403')) {
    return {
      status: 403,
      message:
        'Gemini API permission denied. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('400')) {
    return {
      status: 400,
      message:
        'Gemini API request or key is invalid. Please check your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API quota reached. Please retry shortly or check billing in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: rawMessage || 'Failed to generate magical item.',
  };
}

const VAULT_DB_PATH = path.resolve(__dirname, 'data', 'vault-db.json');

function readVaultDb(): unknown[] | null {
  try {
    if (!fs.existsSync(VAULT_DB_PATH)) return null;
    const raw = fs.readFileSync(VAULT_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeVaultDb(items: unknown[]): void {
  fs.mkdirSync(path.dirname(VAULT_DB_PATH), { recursive: true });
  fs.writeFileSync(VAULT_DB_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/vault', (_req, res) => {
    const items = readVaultDb();
    res.json({ items });
  });

  app.put('/api/vault', (req, res) => {
    try {
      const { items } = req.body ?? {};
      if (!Array.isArray(items)) {
        res.status(400).json({ error: 'Invalid vault payload: items must be an array.' });
        return;
      }
      writeVaultDb(items);
      res.json({ ok: true, count: items.length });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to persist vault database.',
      });
    }
  });

  app.post('/api/items/suggest-name', async (req, res) => {
    try {
      const { rarity, iconLabel, themePrompt } = req.body ?? {};
      const ai = createGeminiClient();

      const prompt = [
        `Invent one evocative, authentic Dungeons & Dragons 5e magical item name.`,
        `Rarity: ${rarity || 'Rare'}.`,
        `Icon / Base Form: ${iconLabel || 'Runed Blade'}.`,
        themePrompt ? `Theme hint: ${themePrompt}.` : '',
        `Keep it concise (2 to 5 words), atmospheric, and never include rarity words inside the name.`,
      ]
        .filter(Boolean)
        .join(' ');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'A 2 to 5 word D&D magical item name.',
              },
            },
            required: ['name'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error('Model returned an empty item name.');
      }
      res.json({ name: parsed.name.trim() });
    } catch (err) {
      const { status, message } = getGeminiErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/items/generate', async (req, res) => {
    try {
      const {
        name,
        rarity,
        icon,
        categoryHint,
        themePrompt,
        attunementPreference,
        customStats,
        customEffect,
      } = req.body ?? {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Item name is required before generating.' });
        return;
      }
      if (!rarity || typeof rarity !== 'string') {
        res.status(400).json({ error: 'Rarity level is required.' });
        return;
      }
      if (!icon || !icon.url) {
        res.status(400).json({ error: 'An item icon must be selected.' });
        return;
      }

      const ai = createGeminiClient();

      const attunementInstruction =
        attunementPreference === 'required'
          ? 'requiresAttunement MUST be true.'
          : attunementPreference === 'none'
          ? 'requiresAttunement MUST be false.'
          : 'Decide whether requiresAttunement should be true or false based on D&D 5e conventions for this rarity and item type.';

      const categoryInstruction =
        categoryHint && categoryHint !== 'Auto'
          ? `The category MUST be "${categoryHint}".`
          : `Choose the best matching category from: "Weapon", "Armor & Shield", "Wondrous Item", "Ring", "Staff & Wand", "Potion & Elixir", "Tome & Scroll" based on "${icon.label}" and the item name.`;

      const userProvidedStats = Array.isArray(customStats)
        ? customStats
            .slice(0, 8)
            .map((s: Record<string, unknown>) => ({
              attribute: String(s.attribute || '').trim(),
              modifier: String(s.modifier || '').trim(),
              ...(s.note && String(s.note).trim()
                ? { note: String(s.note).trim() }
                : {}),
            }))
            .filter((s) => s.attribute || s.modifier)
            .map((s) => ({
              attribute: s.attribute || 'Bonus',
              modifier: s.modifier || '+1',
              ...(s.note ? { note: s.note } : {}),
            }))
        : [];

      const userProvidedEffect =
        typeof customEffect === 'string' ? customEffect.trim() : '';

      const systemInstruction = [
        'You are a master Dungeons & Dragons 5e magic item designer.',
        'Generate balanced, evocative magical gear whose power, gold value, and stat modifiers strictly fit the specified rarity tier:',
        '- Common: minor magical quirks, 50-100 gp, modest +0/+1 situational edge.',
        '- Uncommon: +1 weapons/focuses or handy tactical utility, 101-500 gp.',
        '- Rare: +1 or +2 bonuses, elemental riders or 3-5 charges, 501-5000 gp.',
        '- Very Rare: +2 or +3 potency, strong combat/saving throw modifiers, 5001-50000 gp.',
        '- Legendary: +3 pinnacle relic, transformative mechanics, 50000-150000 gp.',
        '- Artifact: mythic unique relic with grand powers and a lingering cost/omen, 150000+ gp.',
        'Keep flavorText to 2 vivid sentences under 165 characters so it fits cleanly on a uniform tabletop card.',
        'Keep mechanicsSummary to 1-2 crisp sentences under 180 characters.',
        'For statModifiers: provide 1 to 3 concise stat modifiers (or just 1 Weapon Damage entry if it is purely a weapon with damage stats). Keep attribute names under 20 chars, modifier values punchy (e.g. "+2", "1d8+1 Slashing", "+10 ft"), and optional notes under 30 chars.',
      ].join('\n');

      const prompt = [
        `Design a unique D&D magical item with these exact user selections:`,
        `Item Name: "${name.trim()}"`,
        `Rarity: "${rarity}"`,
        `Selected Icon Archetype: "${icon.label}"`,
        categoryInstruction,
        attunementInstruction,
        userProvidedStats.length > 0
          ? `User-Locked Stat Modifiers (honor these exact stats in lore/mechanics): ${JSON.stringify(
              userProvidedStats
            )}`
          : '',
        userProvidedEffect
          ? `User-Locked Effect (write lore matching this exact effect): "${userProvidedEffect}"`
          : '',
        themePrompt && typeof themePrompt === 'string' && themePrompt.trim()
          ? `Lore / Theme Direction: "${themePrompt.trim()}"`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description:
                  'One of: Weapon, Armor & Shield, Wondrous Item, Ring, Staff & Wand, Potion & Elixir, Tome & Scroll',
              },
              requiresAttunement: { type: Type.BOOLEAN },
              attunementRequirement: {
                type: Type.STRING,
                description:
                  'Optional short class/creature requirement if requiresAttunement is true, e.g. "Spellcaster" or "Paladin".',
              },
              flavorText: {
                type: Type.STRING,
                description: 'Evocative 2-sentence lore description under 165 characters.',
              },
              mechanicsSummary: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence rules summary under 180 characters.',
              },
              statModifiers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    attribute: { type: Type.STRING },
                    modifier: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['attribute', 'modifier'],
                },
              },
              hasCharges: { type: Type.BOOLEAN },
              chargeMax: { type: Type.INTEGER },
              chargeRecharge: { type: Type.STRING },
              estimatedValueGp: { type: Type.INTEGER },
              weightLb: { type: Type.NUMBER },
            },
            required: [
              'category',
              'requiresAttunement',
              'flavorText',
              'mechanicsSummary',
              'statModifiers',
              'hasCharges',
              'estimatedValueGp',
              'weightLb',
            ],
          },
        },
      });

      const generated = JSON.parse((response.text ?? '{}').trim());

      const validCategories = [
        'Weapon',
        'Armor & Shield',
        'Wondrous Item',
        'Ring',
        'Staff & Wand',
        'Potion & Elixir',
        'Tome & Scroll',
      ];
      const resolvedCategory = validCategories.includes(generated.category)
        ? generated.category
        : categoryHint && categoryHint !== 'Auto'
        ? categoryHint
        : 'Wondrous Item';

      const generatedModifiers = Array.isArray(generated.statModifiers)
        ? generated.statModifiers.slice(0, 6).map((m: Record<string, unknown>) => ({
            attribute: String(m.attribute || 'Bonus'),
            modifier: String(m.modifier || '+1'),
            ...(m.note ? { note: String(m.note) } : {}),
          }))
        : [];

      const finalModifiers =
        userProvidedStats.length > 0 ? userProvidedStats : generatedModifiers;

      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const allowedFormats = ['webp', 'svg', 'png', 'jpg', 'gif', 'avif'];
      const resolvedFormat = allowedFormats.includes(String(icon.format).toLowerCase())
        ? String(icon.format).toLowerCase()
        : 'webp';

      const uniqueSuffix = `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

      const item = {
        id: `relic-${slug || 'item'}-${uniqueSuffix}`,
        name: name.trim(),
        rarity,
        category: resolvedCategory,
        requiresAttunement: Boolean(generated.requiresAttunement),
        ...(generated.requiresAttunement && generated.attunementRequirement
          ? { attunementRequirement: String(generated.attunementRequirement) }
          : {}),
        icon: {
          id: String(icon.id),
          label: String(icon.label),
          url: String(icon.url),
          format: resolvedFormat,
        },
        flavorText: String(generated.flavorText || ''),
        mechanicsSummary: userProvidedEffect || String(generated.mechanicsSummary || ''),
        statModifiers: finalModifiers,
        ...(generated.hasCharges && generated.chargeMax
          ? {
              charges: {
                max: Number(generated.chargeMax),
                recharge: String(generated.chargeRecharge || 'Dawn'),
              },
            }
          : {}),
        estimatedValueGp: Number(generated.estimatedValueGp) || 100,
        weightLb: Number(generated.weightLb) || 1,
        createdAt: new Date().toISOString(),
      };

      res.json({ item });
    } catch (err) {
      const { status, message } = getGeminiErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Relic Forge server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
