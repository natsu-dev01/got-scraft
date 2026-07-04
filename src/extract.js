/**
 * @fileoverview Extractores de datos desde HTML parseado con cheerio.
 * Soportados: links, imágenes, scripts, estilos, emails, iframes, formularios, JSON-LD.
 */

/**
 * Extrae todos los links (href) de un documento.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @param {string} baseUrl - URL base para resolver rutas relativas.
 * @returns {string[]} URLs absolutas únicas.
 */
function extractLinks($, baseUrl) {
  const links = new Set();

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

/**
 * Extrae todas las imágenes (src) de un documento.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @param {string} baseUrl - URL base para resolver rutas.
 * @returns {string[]} URLs de imágenes únicas.
 */
function extractImages($, baseUrl) {
  const images = new Set();

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

/**
 * Extrae todos los scripts externos (src) de un documento.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @param {string} baseUrl - URL base para resolver rutas.
 * @returns {string[]} URLs de scripts únicas.
 */
function extractScripts($, baseUrl) {
  const scripts = new Set();

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

/**
 * Extrae todos los estilos externos (CSS) de un documento.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @param {string} baseUrl - URL base.
 * @returns {string[]} URLs de CSS únicas.
 */
function extractStyles($, baseUrl) {
  const styles = new Set();

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

/**
 * Extrae direcciones de email de un texto.
 * @param {string} text - Texto a buscar.
 * @returns {string[]} Emails encontrados.
 */
function extractEmails(text) {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(regex) || [])];
}

/**
 * Extrae URLs de iframes de un documento.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @param {string} baseUrl - URL base.
 * @returns {string[]} URLs de iframes únicas.
 */
function extractIFrames($, baseUrl) {
  const frames = new Set();

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

/**
 * Extrae formularios con sus campos.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @returns {Array<{action: string, method: string, inputs: Array<{name: string, type: string, value: string}>}>}
 */
function extractForms($) {
  const forms = [];

  $('form').each((_, el) => {
    const $form = $(el);
    const form = {
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

/**
 * Extrae datos JSON-LD estructurados del documento.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @returns {object[]} Arreglo de objetos JSON-LD.
 */
function extractJsonLd($) {
  const data = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      data.push(JSON.parse($(el).text()));
    } catch {
      // Ignorar JSON inválido
    }
  });

  return data;
}

module.exports = { extractLinks, extractImages, extractScripts, extractStyles, extractEmails, extractIFrames, extractForms, extractJsonLd };
