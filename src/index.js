/**
 * got-scraft — Módulo de scraping profesional.
 *
 * Características:
 * - HTTP client con axios + cheerio
 * - Anti-bloqueo: proxies rotativos, rate limiting, cache busting
 * - Headers camuflados con perfiles de dispositivo reales
 * - Extracción de datos: meta tags, links, imágenes, scripts, emails
 * - Sesiones con cookies persistentes
 * - Soporte CommonJS y ES Modules
 *
 * @module got-scraft
 */

'use strict';

const crypto = require('node:crypto');
const pkg = require('../package.json');

/** Hashes SHA256 de cada versión para verificar integridad. */
const INTEGRITY = {
  '2.0.0': '515c8e83f6020ea5e23abe7e9bcdef0bd3565cd81d43f6d48cce7d1dc48ff79a',
  '2.1.0': '7d58bff27aa800a01a92bd50bc5c421f00fc67ebe911472f53bf37a12347a967',
};

const {
  fetch, fetchWithRetry, post
} = require('./http');
const {
  buildFbHeaders, toMobileUrl, toGraphApiUrl,
  parseMbasicContent, extractFacebookVideo,
  extractFacebookPostId, extractPageName,
} = require('./facebook');
const { createClient, createSession } = require('./client');
const {
  load, getMeta, getAllMeta, getOG,
  getText, getLines, matchText, stripHTML, parseNumber,
} = require('./parser');
const {
  extractLinks, extractImages, extractScripts, extractStyles,
  extractEmails, extractIFrames, extractForms, extractJsonLd,
} = require('./extract');
const {
  buildHeaders, buildSecChUa,
  PROFILES, AGENTS, REFERERS, LANGUAGES,
} = require('./headers');
const {
  ProxyRotator, Throttler, cacheBust, isBlocked, inspectResponse,
} = require('./anti');
const {
  cookiesFromFile, cookiesFromNetscape, cookiesFromBrowser,
  cookiesToHeader, mergeCookies,
} = require('./cookies');
const {
  rand, pick, shuffle, shuffleObjectKeys,
  sleep, randomDelay, saveJSON, loadJSON, log,
} = require('./utils');

/**
 * Scrapea meta tags y Open Graph de una URL.
 * @param {string} url - URL a analizar.
 * @param {Object} [opts] - Opciones de fetch.
 * @returns {Promise<{url: string, title: string, meta: Record<string,string>, og: Record<string,string>}>}
 */
async function scrapeMeta(url, opts = {}) {
  const html = await fetch(url, { ...opts, cookieJar: false });
  const $ = load(html);
  return {
    url,
    meta: getAllMeta($),
    title: $('title').text().trim(),
    og: getOG($),
  };
}

/**
 * Verifica la integridad del módulo comparando el hash SHA256.
 * @returns {{ ok: boolean, version: string, hash: string, expected: string }}
 */
function verify() {
  const fs = require('node:fs');
  const path = require('node:path');
  const expected = INTEGRITY[pkg.version];

  if (!expected) {
    return { ok: false, version: pkg.version, error: 'No integrity hash for this version' };
  }

  const mainFile = path.join(__dirname, 'index.js');
  const content = fs.readFileSync(mainFile);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  return { ok: hash === expected, version: pkg.version, hash, expected };
}

/**
 * Scrapea contenido público de Facebook.
 * Estrategias por orden de prioridad:
 *   1. mbasic.facebook.com (ultra-ligero, sin JS, mayor tasa de éxito)
 *   2. Graph API (si está disponible)
 *   3. facebook.com desktop (más restrictivo, último intento)
 *
 * @param {string} url - URL de Facebook a scrapear.
 * @param {Object} [opts] - Opciones.
 * @param {boolean} [opts.tryGraphApi=false] - Intentar Graph API.
 * @param {string} [opts.responseType='text'] - Tipo de respuesta.
 * @param {import('axios').AxiosInstance} [opts.client] - Cliente axios.
 * @returns {Promise<{success: boolean, source: string, content: Object, error?: string}>}
 */
async function scrapeFacebook(url, opts = {}) {
  const client = opts.client || createClient({
    headers: buildFbHeaders('mobile'),
    timeout: 15000,
    cookieJar: true,
  });

  const strategies = [];

  // 1. mbasic.facebook.com (ultra-ligero, casi siempre funciona)
  strategies.push({
    name: 'mbasic',
    url: toMobileUrl(url),
    headers: buildFbHeaders('mobile'),
  });

  // 2. Graph API (opcional)
  if (opts.tryGraphApi) {
    const graphUrl = toGraphApiUrl(url);
    if (graphUrl) {
      strategies.push({
        name: 'graph',
        url: graphUrl,
        headers: buildFbHeaders('graph'),
      });
    }
  }

  // 3. facebook.com normal
  strategies.push({
    name: 'desktop',
    url: url,
    headers: buildFbHeaders('desktop'),
  });

  for (const strategy of strategies) {
    try {
      const { data } = await client.get(strategy.url, {
        headers: strategy.headers,
        responseType: opts.responseType || 'text',
      });

      if (strategy.name === 'graph') {
        return {
          success: true,
          source: 'graph',
          content: typeof data === 'string' ? JSON.parse(data) : data,
        };
      }

      const parsed = parseMbasicContent(data);

      if (parsed.error === 'blocked') {
        continue;
      }

      return {
        success: true,
        source: strategy.name,
        content: parsed,
      };
    } catch {
      continue;
    }
  }

  return {
    success: false,
    source: 'none',
    content: null,
    error: 'All Facebook strategies failed (blocked or unreachable)',
  };
}

module.exports = {
  // Información del módulo
  version: pkg.version,
  integrity: INTEGRITY,
  verify,

  // HTTP
  fetch, fetchWithRetry, post, createClient, createSession,

  // HTML Parser
  load, getMeta, getAllMeta, getOG, getText, getLines,
  matchText, stripHTML, parseNumber,

  // Extractors
  extractLinks, extractImages, extractScripts, extractStyles,
  extractEmails, extractIFrames, extractForms, extractJsonLd,

  // Anti-blocking
  ProxyRotator, Throttler, cacheBust, isBlocked, inspectResponse,

  // Headers
  buildHeaders, buildSecChUa, PROFILES, AGENTS, REFERERS, LANGUAGES,

  // Cookies
  cookiesFromFile, cookiesFromNetscape, cookiesFromBrowser,
  cookiesToHeader, mergeCookies,

  // Utilities
  rand, pick, shuffle, shuffleObjectKeys, sleep, randomDelay,
  saveJSON, loadJSON, log,

  // Meta Scraper
  scrapeMeta,

  // Facebook
  scrapeFacebook,
  buildFbHeaders, toMobileUrl, toGraphApiUrl,
  parseMbasicContent, extractFacebookVideo,
  extractFacebookPostId, extractPageName,
};
