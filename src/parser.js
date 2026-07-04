/**
 * @fileoverview Parseo de HTML con cheerio, encoding auto-detect,
 * extracción de meta tags, y utilidades de texto.
 */

const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const chardet = require('chardet');

/**
 * Carga HTML en cheerio con soporte de encoding automático.
 * @param {string} html - HTML crudo.
 * @param {Object} [opts] - Opciones de parseo.
 * @param {string} [opts.encoding] - Forzar encoding específico.
 * @param {boolean} [opts.autoDetect] - Detectar encoding automáticamente.
 * @returns {import('cheerio').CheerioAPI} Instancia de cheerio.
 */
function load(html, opts = {}) {
  let buffer = html;

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

/**
 * Obtiene el contenido de una meta tag por su propiedad o nombre.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @param {string} prop - Propiedad o nombre de la meta tag.
 * @returns {string} Contenido o string vacío.
 */
function getMeta($, prop) {
  return $(`meta[property="${prop}"], meta[name="${prop}"]`).attr('content') || '';
}

/**
 * Obtiene todas las meta tags como objeto key-value.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @returns {Record<string, string>} Mapa de meta tags.
 */
function getAllMeta($) {
  const tags = {};
  $('meta').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('property') || $el.attr('name') || '';
    const value = $el.attr('content') || '';
    if (key && value) tags[key] = value;
  });
  return tags;
}

/**
 * Extrae solo las meta tags Open Graph (og:*) como objeto.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @returns {Record<string, string>} Tags OG sin prefijo "og:".
 */
function getOG($) {
  const og = {};
  $('meta[property^="og:"]').each((_, el) => {
    const $el = $(el);
    og[$el.attr('property').replace('og:', '')] = $el.attr('content') || '';
  });
  return og;
}

/**
 * Obtiene el texto plano del body.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @returns {string} Texto limpio sin espacios múltiples.
 */
function getText($) {
  return $('body').text().replace(/\s+/g, ' ').trim();
}

/**
 * Obtiene líneas de texto no vacías del body.
 * @param {import('cheerio').CheerioAPI} $ - Instancia de cheerio.
 * @returns {string[]} Arreglo de líneas.
 */
function getLines($) {
  return getText($).split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Busca múltiples patrones regex en un texto y devuelve el primer match.
 * @param {string} text - Texto a buscar.
 * @param {RegExp[]} patterns - Arreglo de expresiones regulares.
 * @returns {{ match: string, capture: string|null }|null} Resultado del match.
 */
function matchText(text, patterns) {
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

/**
 * Elimina todas las etiquetas HTML y entidades.
 * @param {string} html - HTML a limpiar.
 * @returns {string} Texto plano.
 */
function stripHTML(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parsea strings como "1.5k", "2M", "3mil" a número entero.
 * @param {string} str - String a parsear.
 * @returns {string|null} Número como string o null.
 */
function parseNumber(str) {
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

module.exports = { load, getMeta, getAllMeta, getOG, getText, getLines, matchText, stripHTML, parseNumber };
