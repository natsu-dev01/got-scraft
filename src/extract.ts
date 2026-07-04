import type { CheerioAPI } from 'cheerio';

export interface FormField {
  name: string;
  type: string;
  value: string;
}

export interface FormData {
  action: string;
  method: string;
  inputs: FormField[];
}

export function extractLinks($: CheerioAPI, baseUrl: string): string[] {
  const links = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      links.add(new URL(href, baseUrl).href);
    } catch {
      links.add(href);
    }
  });

  return [...links];
}

export function extractImages($: CheerioAPI, baseUrl: string): string[] {
  const images = new Set<string>();

  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    try {
      images.add(new URL(src, baseUrl).href);
    } catch {
      images.add(src);
    }
  });

  return [...images];
}

export function extractScripts($: CheerioAPI, baseUrl: string): string[] {
  const scripts = new Set<string>();

  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    try {
      scripts.add(new URL(src, baseUrl).href);
    } catch {
      scripts.add(src);
    }
  });

  return [...scripts];
}

export function extractStyles($: CheerioAPI, baseUrl: string): string[] {
  const styles = new Set<string>();

  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      styles.add(new URL(href, baseUrl).href);
    } catch {
      styles.add(href);
    }
  });

  return [...styles];
}

export function extractEmails(text: string): string[] {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(regex) || [])];
}

export function extractIFrames($: CheerioAPI, baseUrl: string): string[] {
  const frames = new Set<string>();

  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    try {
      frames.add(new URL(src, baseUrl).href);
    } catch {
      frames.add(src);
    }
  });

  return [...frames];
}

export function extractForms($: CheerioAPI): FormData[] {
  const forms: FormData[] = [];

  $('form').each((_, el) => {
    const $form = $(el);
    const form: FormData = {
      action: $form.attr('action') || '',
      method: ($form.attr('method') || 'get').toUpperCase(),
      inputs: [],
    };

    $form.find('input, textarea, select').each((__, input) => {
      const $input = $(input);
      form.inputs.push({
        name: $input.attr('name') || '',
        type: $input.attr('type') || 'text',
        value: $input.attr('value') || '',
      });
    });

    forms.push(form);
  });

  return forms;
}

export function extractJsonLd($: CheerioAPI): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      data.push(JSON.parse($(el).text()));
    } catch {
      // Ignorar JSON inválido
    }
  });

  return data;
}
