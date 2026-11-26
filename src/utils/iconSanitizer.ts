import type { IconFormat } from '../types/item';

export const ACCEPTED_ICON_MIME_AND_EXT =
  '.webp,.svg,.png,.jpg,.jpeg,.gif,.avif,image/webp,image/svg+xml,image/png,image/jpeg,image/gif,image/avif';

export function detectIconFormat(
  mimeOrExt: string,
  fallbackName = ''
): IconFormat | null {
  const lower = `${mimeOrExt} ${fallbackName}`.toLowerCase();
  if (lower.includes('image/svg+xml') || lower.includes('.svg')) return 'svg';
  if (lower.includes('image/webp') || lower.includes('.webp')) return 'webp';
  if (lower.includes('image/png') || lower.includes('.png')) return 'png';
  if (lower.includes('image/jpeg') || lower.includes('.jpg') || lower.includes('.jpeg'))
    return 'jpg';
  if (lower.includes('image/gif') || lower.includes('.gif')) return 'gif';
  if (lower.includes('image/avif') || lower.includes('.avif')) return 'avif';
  return null;
}

export function sanitizeSvgMarkup(rawSvg: string): string {
  const trimmed = rawSvg.trim();
  if (!trimmed.toLowerCase().includes('<svg')) {
    throw new Error('Input does not contain a valid <svg> root element.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid SVG XML syntax.');
  }

  const svgEl = doc.documentElement;
  if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
    throw new Error('Root element must be <svg>.');
  }

  // Remove dangerous scripting or embedded HTML elements
  const blockedTags = svgEl.querySelectorAll(
    'script, foreignObject, iframe, object, embed'
  );
  blockedTags.forEach((node) => node.remove());

  // Strip inline event handlers (onload, onclick, etc.) and javascript: hrefs
  const allElements = [svgEl, ...Array.from(svgEl.querySelectorAll('*'))];
  for (const el of allElements) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (
        (name === 'href' || name === 'xlink:href') &&
        (value.startsWith('javascript:') || value.startsWith('data:text/html'))
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }

  if (!svgEl.getAttribute('xmlns')) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!svgEl.getAttribute('width') && svgEl.getAttribute('viewBox')) {
    svgEl.setAttribute('width', '256');
    svgEl.setAttribute('height', '256');
  }

  const serialized = new XMLSerializer().serializeToString(svgEl);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
}

export function parseDataImageUri(raw: string): {
  url: string;
  format: IconFormat;
} {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^data:(image\/(?:webp|svg\+xml|png|jpeg|jpg|gif|avif))(;[^,]*)?,(.*)$/is
  );
  if (!match) {
    throw new Error(
      'Paste either raw <svg>...</svg> markup or a valid data:image/... URI.'
    );
  }
  const mime = match[1].toLowerCase();
  const format = detectIconFormat(mime) ?? 'png';

  if (mime === 'image/svg+xml') {
    const isBase64 = (match[2] ?? '').toLowerCase().includes('base64');
    const decoded = isBase64 ? atob(match[3]) : decodeURIComponent(match[3]);
    return {
      url: sanitizeSvgMarkup(decoded),
      format: 'svg',
    };
  }

  return {
    url: trimmed,
    format,
  };
}
