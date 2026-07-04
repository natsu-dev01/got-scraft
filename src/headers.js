/**
 * @fileoverview Construcción de headers HTTP con perfiles de dispositivo reales.
 * Camufla las peticiones para evitar detección de bots.
 */

const { rand, pick } = require('./utils');

/**
 * @typedef {Object} DeviceProfile
 * @property {string} ua - User-Agent del dispositivo.
 * @property {string} platform - Plataforma (Windows, macOS, Linux, iOS, Android).
 * @property {string} mobile - Indicador de móvil (?0 o ?1).
 */

/** @type {DeviceProfile[]} Perfiles completos de dispositivos reales. */
const PROFILES = [
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', platform: '"macOS"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36', platform: '"macOS"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: '"Linux"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0', platform: '"Windows"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0', platform: '"macOS"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0', platform: '"Windows"', mobile: '?0' },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', platform: '"iOS"', mobile: '?1' },
  { ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36', platform: '"Android"', mobile: '?1' },
];

/** Lista plana de User-Agents. */
const AGENTS = PROFILES.map(p => p.ua);

/** Fuentes de referer realistas. */
const REFERERS = [
  'https://www.google.com/', 'https://www.bing.com/', 'https://search.yahoo.com/',
  'https://www.facebook.com/', 'https://twitter.com/', 'https://www.instagram.com/',
  'https://www.youtube.com/', 'https://www.reddit.com/', 'https://t.co/',
  'https://l.facebook.com/', 'https://www.google.com/search?q=scraping',
  'https://duckduckgo.com/', 'https://www.linkedin.com/', 'https://www.pinterest.com/',
  'https://www.tumblr.com/', 'https://news.ycombinator.com/', 'https://stackoverflow.com/',
  'https://github.com/', 'https://medium.com/', 'https://www.wikipedia.org/',
  'https://www.quora.com/', 'https://discord.com/', 'https://telegram.org/',
];

/** Locales de idioma realistas. */
const LANGUAGES = [
  'es-ES,es;q=0.9,en;q=0.8', 'es-MX,es;q=0.9,en;q=0.8',
  'en-US,en;q=0.9,es;q=0.8', 'en-GB,en;q=0.9,es;q=0.8',
  'es-AR,es;q=0.9,en;q=0.8', 'pt-BR,pt;q=0.9,en;q=0.8,es;q=0.5',
  'fr-FR,fr;q=0.9,en;q=0.8', 'de-DE,de;q=0.9,en;q=0.8',
  'it-IT,it;q=0.9,en;q=0.8', 'en-US,en;q=0.9',
  'ja-JP,ja;q=0.9,en;q=0.8', 'ko-KR,ko;q=0.9,en;q=0.8',
];

/**
 * Construye el header Sec-Ch-Ua con versión aleatoria de Chrome.
 * @returns {string} Valor para Sec-Ch-Ua.
 */
function buildSecChUa() {
  const v = rand(120, 129);
  return `"Google Chrome";v="${v}", "Chromium";v="${v}", "Not.A/Brand";v="24"`;
}

/**
 * Construye headers HTTP completos con camuflaje anti-detección.
 * @param {Object} [opts] - Opciones de configuración.
 * @param {string} [opts.userAgent] - User-Agent personalizado.
 * @param {DeviceProfile} [opts.profile] - Perfil de dispositivo completo.
 * @param {string} [opts.lang] - Accept-Language personalizado.
 * @param {string} [opts.referer] - Referer personalizado.
 * @param {boolean} [opts.cacheBust] - Agrega X-Request-Id único.
 * @param {boolean} [opts.randomizeHeaders] - Mezcla el orden de los headers.
 * @param {Record<string, string>} [opts.headers] - Headers adicionales.
 * @returns {Record<string, string>} Headers listos para usar.
 */
function buildHeaders(opts = {}) {
  const profile = opts.profile || pick(PROFILES);
  const lang = opts.lang || pick(LANGUAGES);

  const headers = {
    'User-Agent': opts.userAgent || profile.ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': lang,
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': opts.referer || pick(REFERERS),
    'Sec-Ch-Ua': buildSecChUa(),
    'Sec-Ch-Ua-Mobile': profile.mobile,
    'Sec-Ch-Ua-Platform': profile.platform,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': pick(['same-origin', 'cross-site', 'none']),
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': pick(['max-age=0', 'no-cache', 'no-store']),
    'Pragma': 'no-cache',
    'DNT': pick(['1', '0']),
    'Connection': 'keep-alive',
    'Priority': 'u=0, i',
    ...(opts.cacheBust ? { 'X-Request-Id': `${Date.now()}-${rand(1000, 9999)}` } : {}),
    ...opts.headers,
  };

  if (opts.randomizeHeaders) {
    const { shuffleObjectKeys } = require('./utils');
    return shuffleObjectKeys(headers);
  }

  return headers;
}

module.exports = { PROFILES, AGENTS, REFERERS, LANGUAGES, buildHeaders, buildSecChUa };
