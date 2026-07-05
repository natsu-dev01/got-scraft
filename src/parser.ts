import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import chardet from 'chardet';

export interface LoadOptions {
  encoding?: string;
  autoDetect?: boolean;
}

export interface MatchResult {
  match: string;
  capture: string | null;
}

export function load(html: string, opts: LoadOptions = {}): cheerio.CheerioAPI {
  let buffer: string = html;

  if (opts.encoding && opts.encoding !== 'utf8') {
    buffer = iconv.decode(Buffer.from(html, 'binary'), opts.encoding);
  }

  if (opts.autoDetect) {
    const detected = chardet.detect(Buffer.from(html));
    if (detected && detected.toLowerCase() !== 'utf-8') {
      buffer = iconv.decode(Buffer.from(html, 'binary'), detected);
    }
  }

  return cheerio.load(buffer);
}

export function getMeta($: cheerio.CheerioAPI, prop: string): string {
  return $(`meta[property="${prop}"], meta[name="${prop}"]`).attr('content') || '';
}

export function getAllMeta($: cheerio.CheerioAPI): Record<string, string> {
  const tags: Record<string, string> = {};
  $('meta').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('property') || $el.attr('name') || '';
    const value = $el.attr('content') || '';
    if (key && value) tags[key] = value;
  });
  return tags;
}

export function getOG($: cheerio.CheerioAPI): Record<string, string> {
  const og: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const $el = $(el);
    const prop = $el.attr('property') || '';
    og[prop.replace('og:', '')] = $el.attr('content') || '';
  });
  return og;
}

export function getText($: cheerio.CheerioAPI): string {
  return $('body').text().replace(/\s+/g, ' ').trim();
}

export function getLines($: cheerio.CheerioAPI): string[] {
  return getText($).split('\n').map(l => l.trim()).filter(Boolean);
}

export function matchText(text: string, patterns: RegExp[]): MatchResult | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        match: match[0],
        capture: match[1]?.trim() || null,
      };
    }
  }
  return null;
}

export function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNumber(str: string): string | null {
  if (!str) return null;

  const match = str.match(/^([\d\s.,]+)\s*(mil|k|m|b)?$/i);
  if (!match) return null;

  let value = parseFloat(
    match[1]
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );

  if (isNaN(value)) return null;

  const suffix = match[2]?.toLowerCase();
  if (suffix === 'k' || suffix === 'mil') value *= 1e3;
  else if (suffix === 'm') value *= 1e6;
  else if (suffix === 'b') value *= 1e9;

  return Math.round(value).toString();
}
