import { jsPDF } from 'jspdf';
import { RARITY_THEMES } from '../data/rarities';
import type { DndItem, Rarity } from '../types/item';

export type SleevePreset = 'standard' | 'tarot';
export type PaperFormat = 'letter' | 'a4';
export type PdfCardStyle = 'dark' | 'light';

export interface PdfExportOptions {
  sleevePreset: SleevePreset;
  paperFormat: PaperFormat;
  cardStyle: PdfCardStyle;
  showCutMarks: boolean;
  copiesPerItem: number;
}

export interface SheetLayoutSpec {
  cardWidthMm: number;
  cardHeightMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  cols: number;
  rows: number;
  gapMm: number;
  marginLeftMm: number;
  marginTopMm: number;
  cardsPerPage: number;
}

const LIGHT_RARITY_ACCENTS: Record<Rarity, string> = {
  Common: '#475569',
  Uncommon: '#047857',
  Rare: '#1D4ED8',
  'Very Rare': '#7E22CE',
  Legendary: '#B45309',
  Artifact: '#B91C1C',
};

const LIGHT_RARITY_HEADER_BG: Record<Rarity, string> = {
  Common: '#F1F5F9',
  Uncommon: '#ECFDF5',
  Rare: '#EFF6FF',
  'Very Rare': '#FAF5FF',
  Legendary: '#FFFBEB',
  Artifact: '#FEF2F2',
};

export function computeSheetLayout(
  sleevePreset: SleevePreset,
  paperFormat: PaperFormat
): SheetLayoutSpec {
  const pageWidthMm = paperFormat === 'letter' ? 215.9 : 210;
  const pageHeightMm = paperFormat === 'letter' ? 279.4 : 297;

  // 63 x 88 mm fits standard 2.5" x 3.5" (63.5 x 88.9 mm) card sleeves cleanly without forcing
  // 70 x 120 mm fits tarot / large D&D gear sleeves
  const cardWidthMm = sleevePreset === 'standard' ? 63 : 70;
  const cardHeightMm = sleevePreset === 'standard' ? 88 : 120;

  const cols = sleevePreset === 'standard' ? 3 : 2;
  const rows = sleevePreset === 'standard' ? 3 : 2;

  const minMarginMm = 10;
  const maxGapX =
    cols > 1 ? (pageWidthMm - minMarginMm - cols * cardWidthMm) / (cols - 1) : 0;
  const maxGapY =
    rows > 1 ? (pageHeightMm - minMarginMm - rows * cardHeightMm) / (rows - 1) : 0;
  const gapMm = Math.max(0, Math.min(3, Math.floor(Math.min(maxGapX, maxGapY) * 2) / 2));

  const gridWidthMm = cols * cardWidthMm + (cols - 1) * gapMm;
  const gridHeightMm = rows * cardHeightMm + (rows - 1) * gapMm;

  const marginLeftMm = (pageWidthMm - gridWidthMm) / 2;
  const marginTopMm = (pageHeightMm - gridHeightMm) / 2;

  return {
    cardWidthMm,
    cardHeightMm,
    pageWidthMm,
    pageHeightMm,
    cols,
    rows,
    gapMm,
    marginLeftMm,
    marginTopMm,
    cardsPerPage: cols * rows,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

async function rasterizeIconToPng(url: string): Promise<string | null> {
  if (!url) return null;

  let loadUrl = url;
  let objectUrlToRevoke: string | null = null;

  const isSvg =
    url.startsWith('data:image/svg+xml') ||
    url.toLowerCase().split('?')[0].endsWith('.svg');

  if (isSvg) {
    try {
      let svgText = '';
      if (url.startsWith('data:image/svg+xml')) {
        const commaIdx = url.indexOf(',');
        const header = url.slice(0, commaIdx);
        const payload = url.slice(commaIdx + 1);
        svgText = header.includes('base64')
          ? atob(payload)
          : decodeURIComponent(payload);
      } else {
        const resp = await fetch(url);
        if (resp.ok) {
          svgText = await resp.text();
        }
      }

      if (svgText) {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = parsed.documentElement;
        if (svgEl && svgEl.tagName.toLowerCase() === 'svg') {
          if (!svgEl.getAttribute('width')) svgEl.setAttribute('width', '256');
          if (!svgEl.getAttribute('height')) svgEl.setAttribute('height', '256');
          const normalized = new XMLSerializer().serializeToString(svgEl);
          const blob = new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' });
          objectUrlToRevoke = URL.createObjectURL(blob);
          loadUrl = objectUrlToRevoke;
        }
      }
    } catch {
      // Fall back to direct URL load
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(null);
      }
    };
    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve(null);
    };
    img.src = loadUrl;
  });
}

function drawCropMarks(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  markLen = 3
) {
  doc.setDrawColor(115, 125, 140);
  doc.setLineWidth(0.2);

  // Top-left
  doc.line(x - markLen, y, x - 0.8, y);
  doc.line(x, y - markLen, x, y - 0.8);

  // Top-right
  doc.line(x + w + 0.8, y, x + w + markLen, y);
  doc.line(x + w, y - markLen, x + w, y - 0.8);

  // Bottom-left
  doc.line(x - markLen, y + h, x - 0.8, y + h);
  doc.line(x, y + h + 0.8, x, y + h + markLen);

  // Bottom-right
  doc.line(x + w + 0.8, y + h, x + w + markLen, y + h);
  doc.line(x + w, y + h + 0.8, x + w, y + h + markLen);
}

function drawCard(
  doc: jsPDF,
  item: DndItem,
  iconPng: string | null,
  x: number,
  y: number,
  w: number,
  h: number,
  options: PdfExportOptions
) {
  const isDark = options.cardStyle === 'dark';
  const isTarot = options.sleevePreset === 'tarot';
  const pad = isTarot ? 4.2 : 3.2;
  const innerW = w - pad * 2;

  const rarityTheme = RARITY_THEMES[item.rarity];
  const accentHex = isDark
    ? rarityTheme.accentHex
    : LIGHT_RARITY_ACCENTS[item.rarity];
  const [ar, ag, ab] = hexToRgb(accentHex);

  // Card Base Surface
  if (isDark) {
    doc.setFillColor(20, 23, 30);
  } else {
    doc.setFillColor(255, 255, 255);
  }
  doc.rect(x, y, w, h, 'F');

  // Subtle top header band for light or dark theme
  const headerBandH = isTarot ? 16.5 : 13.5;
  if (isDark) {
    doc.setFillColor(26, 30, 40);
    doc.rect(x, y, w, headerBandH, 'F');
  } else {
    const [hr, hg, hb] = hexToRgb(LIGHT_RARITY_HEADER_BG[item.rarity]);
    doc.setFillColor(hr, hg, hb);
    doc.rect(x, y, w, headerBandH, 'F');
  }

  // Rarity accent bar across the very top edge
  doc.setFillColor(ar, ag, ab);
  doc.rect(x, y, w, 1.3, 'F');

  // Card Cut Outline / Border
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, 'S');

  // 1. Metadata Kicker Line
  let cursorY = y + 4.4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isTarot ? 7 : 6);
  doc.setTextColor(ar, ag, ab);
  doc.text(item.rarity.toUpperCase(), x + pad, cursorY);

  const rarityTextW = doc.getTextWidth(item.rarity.toUpperCase());
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isDark ? 160 : 95, isDark ? 170 : 105, isDark ? 185 : 118);
  const metaRight = item.requiresAttunement
    ? `${item.category} · Attunement`
    : item.category;
  const maxMetaW = innerW - rarityTextW - 3;
  const clippedMeta =
    doc.getTextWidth(metaRight) > maxMetaW
      ? metaRight.slice(0, 22) + '…'
      : metaRight;
  doc.text(` · ${clippedMeta}`, x + pad + rarityTextW, cursorY);

  // 2. Item Name (Times Bold serif for classic D&D card aesthetic)
  cursorY += isTarot ? 4.8 : 4.1;
  doc.setFont('times', 'bold');
  doc.setFontSize(isTarot ? 11.5 : 9.4);
  doc.setTextColor(isDark ? 241 : 17, isDark ? 245 : 24, isDark ? 249 : 39);
  const titleLines = doc.splitTextToSize(item.name, innerW).slice(0, 2);
  doc.text(titleLines, x + pad, cursorY);

  cursorY = y + headerBandH + (isTarot ? 3.5 : 2.8);

  // 3. Icon Box + Appraisal Specs
  const iconSize = isTarot ? 17 : 13.5;
  if (isDark) {
    doc.setFillColor(14, 16, 20);
  } else {
    doc.setFillColor(248, 250, 252);
  }
  doc.roundedRect(x + pad, cursorY, iconSize, iconSize, 1.2, 1.2, 'F');

  if (iconPng) {
    doc.addImage(
      iconPng,
      'PNG',
      x + pad + 0.4,
      cursorY + 0.4,
      iconSize - 0.8,
      iconSize - 0.8
    );
  }

  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(0.35);
  doc.roundedRect(x + pad, cursorY, iconSize, iconSize, 1.2, 1.2, 'S');

  const specX = x + pad + iconSize + 2.8;
  const specW = innerW - iconSize - 2.8;
  let specY = cursorY + (isTarot ? 3.8 : 3.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isTarot ? 7 : 6);
  doc.setTextColor(isDark ? 148 : 100, isDark ? 163 : 116, isDark ? 184 : 139);
  doc.text('VALUE', specX, specY);
  doc.text('WEIGHT', specX + specW * 0.52, specY);

  specY += isTarot ? 3.6 : 3.1;
  doc.setFont('courier', 'bold');
  doc.setFontSize(isTarot ? 8 : 6.8);
  doc.setTextColor(isDark ? 226 : 30, isDark ? 232 : 41, isDark ? 240 : 59);
  doc.text(`${item.estimatedValueGp.toLocaleString()} gp`, specX, specY);
  doc.text(`${item.weightLb} lb`, specX + specW * 0.52, specY);

  specY += isTarot ? 4.4 : 3.7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isTarot ? 6.8 : 5.8);
  doc.setTextColor(isDark ? 180 : 71, isDark ? 190 : 85, isDark ? 205 : 105);
  const chargeLine = item.charges
    ? `Charges: ${item.charges.max} (${item.charges.recharge})`
    : item.attunementRequirement
    ? `Req: ${item.attunementRequirement}`
    : 'Passive enchantment';
  const clippedCharge = doc.splitTextToSize(chargeLine, specW)[0] ?? '';
  doc.text(clippedCharge, specX, specY);

  cursorY += iconSize + (isTarot ? 3.2 : 2.6);

  // Hairline Divider
  doc.setDrawColor(isDark ? 45 : 226, isDark ? 52 : 232, isDark ? 65 : 240);
  doc.setLineWidth(0.25);
  doc.line(x + pad, cursorY, x + w - pad, cursorY);
  cursorY += isTarot ? 3.6 : 3.0;

  // 4. Flavor Text
  doc.setFont('times', 'italic');
  doc.setFontSize(isTarot ? 7.6 : 6.4);
  doc.setTextColor(isDark ? 203 : 51, isDark ? 213 : 65, isDark ? 225 : 85);
  const flavorLines = doc
    .splitTextToSize(item.flavorText, innerW)
    .slice(0, isTarot ? 4 : 3);
  doc.text(flavorLines, x + pad, cursorY);
  cursorY += flavorLines.length * (isTarot ? 3.3 : 2.75) + (isTarot ? 2.2 : 1.6);

  // Hairline Divider
  doc.setDrawColor(isDark ? 45 : 226, isDark ? 52 : 232, isDark ? 65 : 240);
  doc.line(x + pad, cursorY, x + w - pad, cursorY);
  cursorY += isTarot ? 3.0 : 2.4;

  // 5. Stat Modifiers (1 to 6 rows, compact when > 3)
  const modifiers = item.statModifiers.slice(0, 6);
  const compactStats = modifiers.length > 3;
  const modRowH = isTarot ? (compactStats ? 4.4 : 5.6) : compactStats ? 3.6 : 4.5;
  for (const mod of modifiers) {
    if (isDark) {
      doc.setFillColor(14, 16, 20);
      doc.setDrawColor(42, 48, 60);
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
    }
    doc.setLineWidth(0.2);
    doc.roundedRect(x + pad, cursorY, innerW, modRowH, 0.8, 0.8, 'FD');

    const textY = cursorY + (isTarot ? (compactStats ? 3.0 : 3.8) : compactStats ? 2.5 : 3.1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isTarot ? (compactStats ? 6.5 : 7.2) : compactStats ? 5.6 : 6.1);
    doc.setTextColor(isDark ? 226 : 30, isDark ? 232 : 41, isDark ? 240 : 59);
    const attrText = doc.splitTextToSize(mod.attribute, innerW * 0.62)[0] ?? '';
    doc.text(attrText, x + pad + 1.6, textY);

    doc.setFont('courier', 'bold');
    doc.setFontSize(isTarot ? (compactStats ? 6.8 : 7.5) : compactStats ? 5.8 : 6.4);
    doc.setTextColor(ar, ag, ab);
    doc.text(mod.modifier, x + w - pad - 1.6, textY, { align: 'right' });

    cursorY += modRowH + (compactStats ? 0.8 : isTarot ? 1.5 : 1.1);
  }

  // 6. Mechanics Summary (bounded cleanly above bottom trim margin)
  cursorY += isTarot ? 1.5 : 1.0;
  const maxMechBottom = y + h - pad - 2.5;
  const remainingH = Math.max(0, maxMechBottom - cursorY);
  const lineStep = isTarot ? 3.2 : 2.65;
  const maxMechLines = Math.max(1, Math.min(isTarot ? 6 : 5, Math.floor(remainingH / lineStep)));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isTarot ? 7 : 5.9);
  doc.setTextColor(isDark ? 168 : 71, isDark ? 178 : 85, isDark ? 195 : 105);
  const mechLines = doc
    .splitTextToSize(item.mechanicsSummary, innerW)
    .slice(0, maxMechLines);
  doc.text(mechLines, x + pad, cursorY + 1.6);

  // Subtle bottom size footer inside safe zone
  doc.setFont('courier', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(isDark ? 100 : 148, isDark ? 110 : 163, isDark ? 125 : 184);
  doc.text(
    `${item.category} · ${w}×${h}mm`,
    x + w / 2,
    y + h - 1.8,
    { align: 'center' }
  );

  // Cut Marks around card perimeter
  if (options.showCutMarks) {
    drawCropMarks(doc, x, y, w, h);
  }
}

export async function exportItemsToPdf(
  items: DndItem[],
  options: PdfExportOptions
): Promise<void> {
  if (items.length === 0) {
    throw new Error('Select at least one item to export.');
  }

  const copies = Math.max(1, Math.min(9, Math.floor(options.copiesPerItem || 1)));
  const expandedItems: DndItem[] = [];
  for (const item of items) {
    for (let i = 0; i < copies; i++) {
      expandedItems.push(item);
    }
  }

  // Pre-convert all item icons (WebP, SVG, PNG, JPG, etc.) to PNG via browser canvas once per unique URL
  const iconPngCache = new Map<string, string | null>();
  await Promise.all(
    items.map(async (item) => {
      if (!iconPngCache.has(item.icon.url)) {
        const png = await rasterizeIconToPng(item.icon.url);
        iconPngCache.set(item.icon.url, png);
      }
    })
  );

  const layout = computeSheetLayout(options.sleevePreset, options.paperFormat);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: options.paperFormat === 'letter' ? 'letter' : 'a4',
    compress: true,
  });

  expandedItems.forEach((item, index) => {
    const slotOnPage = index % layout.cardsPerPage;
    if (index > 0 && slotOnPage === 0) {
      doc.addPage();
    }

    const col = slotOnPage % layout.cols;
    const row = Math.floor(slotOnPage / layout.cols);

    const cardX =
      layout.marginLeftMm + col * (layout.cardWidthMm + layout.gapMm);
    const cardY =
      layout.marginTopMm + row * (layout.cardHeightMm + layout.gapMm);

    const iconPng = iconPngCache.get(item.icon.url) ?? null;
    drawCard(
      doc,
      item,
      iconPng,
      cardX,
      cardY,
      layout.cardWidthMm,
      layout.cardHeightMm,
      options
    );
  });

  const fileSlug =
    items.length === 1
      ? items[0].name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'dnd-item-card'
      : `relic-forge-cards-${items.length}`;

  doc.save(`${fileSlug}.pdf`);
}
