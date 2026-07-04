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

const pkg = require('../package.json');

const { fetch, fetchWithRetry, post } = require('./http');
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

module.exports = {
  // Información del módulo
  version: pkg.version,

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
};
