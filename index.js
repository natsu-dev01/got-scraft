const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ─── Perfiles de dispositivo completos ─────────────────────────
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

const REFERERS = [
  'https://www.google.com/', 'https://www.bing.com/', 'https://search.yahoo.com/',
  'https://www.facebook.com/', 'https://twitter.com/', 'https://www.instagram.com/',
  'https://www.youtube.com/', 'https://www.reddit.com/', 'https://t.co/',
  'https://l.facebook.com/', 'https://www.google.com/search?q=scraping',
  'https://duckduckgo.com/', 'https://www.linkedin.com/', 'https://www.pinterest.com/',
  'https://www.tumblr.com/', 'https://news.ycombinator.com/', 'https://stackoverflow.com/',
  'https://github.com/', 'https://medium.com/', 'https://www.wikipedia.org/',
];

const LANGUAGES = [
  'es-ES,es;q=0.9,en;q=0.8', 'es-MX,es;q=0.9,en;q=0.8',
  'en-US,en;q=0.9,es;q=0.8', 'en-GB,en;q=0.9,es;q=0.8',
  'es-AR,es;q=0.9,en;q=0.8', 'pt-BR,pt;q=0.9,en;q=0.8,es;q=0.5',
  'fr-FR,fr;q=0.9,en;q=0.8', 'de-DE,de;q=0.9,en;q=0.8',
  'it-IT,it;q=0.9,en;q=0.8', 'en-US,en;q=0.9',
];

// ─── Random utilities ──────────────────────────────────────────
const AGENTS = PROFILES.map(p => p.ua);

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  if (!arr?.length) return null;
  return arr[rand(0, arr.length - 1)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min = 1000, max = 3000) {
  return sleep(rand(min, max));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleObjectKeys(obj) {
  const keys = shuffle(Object.keys(obj));
  return keys.reduce((acc, k) => { acc[k] = obj[k]; return acc; }, {});
}

// ─── Number parser ──────────────────────────────────────────────
function parseNumber(str) {
  if (!str) return null;
  const m = str.match(/^([\d\s.,]+)\s*(mil|k|m|b)?$/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) return null;
  const sfx = m[2]?.toLowerCase();
  if (sfx === 'k' || sfx === 'mil') n *= 1e3;
  else if (sfx === 'm') n *= 1e6;
  else if (sfx === 'b') n *= 1e9;
  return Math.round(n).toString();
}

// ─── Headers builder ────────────────────────────────────────────
function buildSecChUa() {
  const v = rand(120, 129);
  return `"Google Chrome";v="${v}", "Chromium";v="${v}", "Not.A/Brand";v="24"`;
}

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
  if (opts.randomizeHeaders) return shuffleObjectKeys(headers);
  return headers;
}

// ─── Cache bust ─────────────────────────────────────────────────
function cacheBust(url) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_=${Date.now()}${rand(100, 999)}`;
}

// ─── Proxy rotator ──────────────────────────────────────────────
class ProxyRotator {
  constructor(proxies = []) {
    this.proxies = proxies;
    this.index = 0;
  }

  loadFromFile(filePath) {
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf8');
      this.proxies = content.split('\n').map(l => l.trim()).filter(Boolean);
    } catch {}
    return this;
  }

  loadFromArray(arr) {
    this.proxies = [...arr];
    return this;
  }

  add(proxy) {
    this.proxies.push(proxy);
    return this;
  }

  next() {
    if (!this.proxies.length) return null;
    const proxy = this.proxies[this.index % this.proxies.length];
    this.index++;
    return proxy;
  }

  random() {
    if (!this.proxies.length) return null;
    return pick(this.proxies);
  }

  parse(proxyStr) {
    if (typeof proxyStr === 'object') return proxyStr;
    const [host, port] = proxyStr.split(':');
    return { host, port: parseInt(port), protocol: 'http' };
  }

  get count() {
    return this.proxies.length;
  }
}

// ─── Throttler ──────────────────────────────────────────────────
class Throttler {
  constructor(maxRPM = 30) {
    this.maxRPM = maxRPM;
    this.timestamps = [];
  }

  async wait() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < 60000);
    if (this.timestamps.length >= this.maxRPM) {
      const wait = this.timestamps[0] + 60000 - now;
      if (wait > 0) await sleep(wait + rand(0, 1000));
    }
    this.timestamps.push(Date.now());
  }

  set max(val) { this.maxRPM = val; }
}

// ─── Client factory ─────────────────────────────────────────────
function createClient(opts = {}) {
  const config = {
    timeout: opts.timeout || 30000,
    headers: buildHeaders(opts),
    decompress: true,
    maxRedirects: opts.maxRedirects || 5,
  };

  if (opts.proxy) {
    config.proxy = typeof opts.proxy === 'string'
      ? new ProxyRotator().parse(opts.proxy)
      : opts.proxy;
  }

  if (opts.cookieJar !== false) {
    try {
      const tough = require('tough-cookie');
      const jar = new tough.CookieJar();
      config.jar = jar;
      config.withCredentials = true;
    } catch {}
  }

  if (opts.cookieFile) {
    try {
      const cookie = fs.readFileSync(path.resolve(opts.cookieFile), 'utf8').trim();
      if (cookie) config.headers.Cookie = cookie;
    } catch {}
  }

  const client = axios.create(config);

  if (opts.cookieJar !== false) {
    try { require('axios-cookiejar-support')(client); } catch {}
  }

  return client;
}

// ─── HTTP methods ───────────────────────────────────────────────
async function fetch(url, opts = {}) {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;
  if (opts.delay) await randomDelay(opts.delayMin || 500, opts.delayMax || 2000);
  if (opts.throttler) await opts.throttler.wait();
  const { data } = await client.get(finalUrl, { responseType: opts.responseType || 'text' });
  return data;
}

async function fetchWithRetry(url, opts = {}) {
  const maxRetries = opts.retries || 3;
  const client = opts.client || createClient({ ...opts, cookieJar: false });

  for (let i = 0; i < maxRetries; i++) {
    try {
      const finalUrl = opts.cacheBust ? cacheBust(url) : url;
      if (opts.throttler) await opts.throttler.wait();
      if (opts.delay && i > 0) await randomDelay(opts.delayMin || 1000, opts.delayMax || 3000);
      const { data } = await client.get(finalUrl, { responseType: opts.responseType || 'text' });
      return data;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      if (opts.proxyRotator && opts.rotateOnError !== false) {
        const next = opts.proxyRotator.next();
        if (next) client.defaults.proxy = opts.proxyRotator.parse(next);
      }
      const wait = Math.min(1000 * Math.pow(2, i) + rand(0, 2000), 30000);
      await sleep(wait);
    }
  }
}

async function post(url, body, opts = {}) {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;
  if (opts.throttler) await opts.throttler.wait();
  const { data } = await client.post(finalUrl, body, {
    headers: { 'Content-Type': opts.contentType || 'application/x-www-form-urlencoded' },
    responseType: opts.responseType || 'text',
  });
  return data;
}

// ─── Cheerio ────────────────────────────────────────────────────
function load(html) {
  return cheerio.load(html);
}

function getMeta($, prop) {
  return $(`meta[property="${prop}"], meta[name="${prop}"]`).attr('content') || '';
}

function getAllMeta($) {
  const tags = {};
  $('meta').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('property') || $el.attr('name') || '';
    const val = $el.attr('content') || '';
    if (key && val) tags[key] = val;
  });
  return tags;
}

function getOG($) {
  const og = {};
  $('meta[property^="og:"]').each((_, el) => {
    const $el = $(el);
    og[$el.attr('property').replace('og:', '')] = $el.attr('content') || '';
  });
  return og;
}

function getText($) {
  return $('body').text().replace(/\s+/g, ' ').trim();
}

function getLines($) {
  return getText($).split('\n').map(l => l.trim()).filter(Boolean);
}

function matchText(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { match: m[0], capture: m[1]?.trim() || null };
  }
  return null;
}

function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractLinks($, baseUrl) {
  const links = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try { links.push(new URL(href, baseUrl).href); } catch { links.push(href); }
    }
  });
  return [...new Set(links)];
}

function extractImages($, baseUrl) {
  const imgs = [];
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      try { imgs.push(new URL(src, baseUrl).href); } catch { imgs.push(src); }
    }
  });
  return [...new Set(imgs)];
}

function extractScripts($, baseUrl) {
  const scripts = [];
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      try { scripts.push(new URL(src, baseUrl).href); } catch { scripts.push(src); }
    }
  });
  return [...new Set(scripts)];
}

function extractEmails(text) {
  return [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
}

// ─── Detection ──────────────────────────────────────────────────
function isBlocked(html) {
  if (!html || typeof html !== 'string') return false;
  const signals = [
    'checkpoint', 'block', 'captcha', 'access denied', 'please wait',
    'automated requests', 'unusual traffic', 'verify you are human',
    'just a moment', 'cf-browser-verify', 'attention required',
    'you have been blocked', 'too many requests', '429',
    'your request has been blocked', 'sorry, you have been blocked',
    'our systems have detected unusual traffic', 'enter the code below',
    'security check', 'prove you\'re not a robot',
  ];
  const lower = html.toLowerCase();
  return signals.some(s => lower.includes(s));
}

function inspectResponse(response) {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    blocked: [429, 403, 503].includes(response.status),
    redirected: response.request?.res?.responseUrl !== response.config?.url,
    finalUrl: response.request?.res?.responseUrl,
    size: (response.data?.length || 0).toString(),
  };
}

// ─── Cookie tools ───────────────────────────────────────────────
function cookiesFromFile(filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf8').trim();
  } catch { return ''; }
}

function cookiesFromNetscape(filePath) {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    const cookies = [];
    for (const line of content.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;
      const parts = line.trim().split('\t');
      if (parts.length >= 7) {
        cookies.push(`${parts[5]}=${parts[6]}`);
      }
    }
    return cookies.join('; ');
  } catch { return ''; }
}

function cookiesToHeader(cookies) {
  if (Array.isArray(cookies)) return cookies.join('; ');
  return cookies;
}

function mergeCookies(...cookies) {
  const map = {};
  for (const c of cookies) {
    if (!c) continue;
    c.split(';').forEach(pair => {
      const [k, ...v] = pair.trim().split('=');
      if (k) map[k.trim()] = v.join('=');
    });
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ─── Session ────────────────────────────────────────────────────
function createSession(opts = {}) {
  const client = createClient({ ...opts, cookieJar: true });
  const throttler = opts.throttler || new Throttler(opts.maxRPM || 30);
  const rotator = opts.proxyRotator || null;
  let lastRequest = 0;

  return {
    client,
    throttler,
    rotator,
    async get(url, reqOpts = {}) {
      await throttler.wait();
      const now = Date.now();
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      if (now - lastRequest < minGap) await sleep(minGap - (now - lastRequest));
      lastRequest = Date.now();
      const finalUrl = reqOpts.cacheBust !== false ? cacheBust(url) : url;
      return fetch(finalUrl, { ...reqOpts, client });
    },
    async post(url, body, reqOpts = {}) {
      await throttler.wait();
      const now = Date.now();
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      if (now - lastRequest < minGap) await sleep(minGap - (now - lastRequest));
      lastRequest = Date.now();
      return post(url, body, { ...reqOpts, client });
    },
    rotateProxy() {
      if (this.rotator) {
        const next = this.rotator.next();
        if (next) client.defaults.proxy = this.rotator.parse(next);
      }
    },
  };
}

// ─── Meta scraper ───────────────────────────────────────────────
async function scrapeMeta(url, opts = {}) {
  const html = await fetch(url, { ...opts, cookieJar: false });
  const $ = load(html);
  return { url, meta: getAllMeta($), title: $('title').text().trim(), og: getOG($) };
}

// ─── File helpers ───────────────────────────────────────────────
function saveJSON(data, filePath) {
  fs.writeFileSync(path.resolve(filePath), JSON.stringify(data, null, 2));
  return filePath;
}

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function log(msg, data) {
  const time = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[${time}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}\n`);
}

// ─── Exports ────────────────────────────────────────────────────
module.exports = {
  // Classes
  ProxyRotator, Throttler,
  // Random
  rand, pick, shuffle, shuffleObjectKeys, sleep, randomDelay,
  // HTTP
  fetch, fetchWithRetry, post, createClient, createSession, cacheBust,
  // Headers
  buildHeaders, buildSecChUa,
  // Cheerio
  load, getMeta, getAllMeta, getOG, getText, getLines, matchText, stripHTML,
  // Extract
  extractLinks, extractImages, extractScripts, extractEmails,
  // Detection
  isBlocked, inspectResponse, cookiesFromFile, cookiesFromNetscape,
  cookiesToHeader, mergeCookies,
  // Number
  parseNumber,
  // Meta
  scrapeMeta,
  // File
  saveJSON, loadJSON, log,
  // Data
  PROFILES, AGENTS, REFERERS, LANGUAGES,
};
