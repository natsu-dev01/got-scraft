const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

const REFERERS = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://search.yahoo.com/',
  'https://www.facebook.com/',
  'https://twitter.com/',
  'https://www.instagram.com/',
  'https://www.youtube.com/',
  'https://www.reddit.com/',
  'https://t.co/',
  'https://l.facebook.com/',
  'https://www.google.com/search?q=scraping',
  'https://duckduckgo.com/',
];

const LANGUAGES = [
  'es-ES,es;q=0.9,en;q=0.8',
  'es-MX,es;q=0.9,en;q=0.8',
  'en-US,en;q=0.9,es;q=0.8',
  'en-GB,en;q=0.9,es;q=0.8',
  'es-AR,es;q=0.9,en;q=0.8',
  'pt-BR,pt;q=0.9,en;q=0.8,es;q=0.5',
];

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

function buildUA() {
  const chromeVer = rand(120, 129);
  const platform = pick(['Windows NT 10.0; Win64; x64', 'Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64']);
  if (platform.startsWith('Windows')) {
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer}.0.0.0 Safari/537.36`;
  }
  if (platform.startsWith('Mac')) {
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer}.0.0.0 Safari/537.36`;
  }
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer}.0.0.0 Safari/537.36`;
}

function buildSecChUa() {
  const v = rand(120, 129);
  return `"Google Chrome";v="${v}", "Chromium";v="${v}", "Not.A/Brand";v="24"`;
}

function buildHeaders(opts = {}) {
  const lang = opts.lang || pick(LANGUAGES);
  const ua = opts.userAgent || pick(AGENTS);
  const headers = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': lang,
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': opts.referer || pick(REFERERS),
    'Sec-Ch-Ua': buildSecChUa(),
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': pick(['"Windows"', '"macOS"', '"Linux"']),
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': pick(['same-origin', 'cross-site', 'none']),
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': pick(['max-age=0', 'no-cache']),
    'Connection': 'keep-alive',
    'DNT': pick(['1', '0']),
    'Priority': 'u=0, i',
    ...opts.headers,
  };
  if (opts.randomizeHeaders) return shuffleObjectKeys(headers);
  return headers;
}

function createClient(opts = {}) {
  const config = {
    timeout: opts.timeout || 30000,
    headers: buildHeaders(opts),
    decompress: true,
    maxRedirects: opts.maxRedirects || 5,
  };

  if (opts.proxy) {
    config.proxy = opts.proxy;
  }

  if (opts.cookieJar !== false) {
    const axiosCookieJar = require('axios-cookiejar-support').wrapper;
    const tough = require('tough-cookie');
    const jar = new tough.CookieJar();
    config.jar = jar;
    config.withCredentials = true;
  }

  if (opts.cookieFile) {
    try {
      const cookie = fs.readFileSync(path.resolve(opts.cookieFile), 'utf8').trim();
      if (cookie) config.headers.Cookie = cookie;
    } catch {}
  }

  const client = axios.create(config);

  if (opts.cookieJar !== false) {
    try {
      require('axios-cookiejar-support')(client);
    } catch {}
  }

  return client;
}

async function fetch(url, opts = {}) {
  const client = opts.client || createClient(opts);
  if (opts.delay) await randomDelay(opts.delayMin || 500, opts.delayMax || 2000);
  const { data } = await client.get(url, { responseType: opts.responseType || 'text' });
  return data;
}

async function fetchWithRetry(url, opts = {}) {
  const maxRetries = opts.retries || 3;
  const client = opts.client || createClient({ ...opts, cookieJar: false });

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (opts.delay && i > 0) await randomDelay(opts.delayMin || 1000, opts.delayMax || 3000);
      const { data } = await client.get(url, { responseType: opts.responseType || 'text' });
      return data;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const wait = Math.min(1000 * Math.pow(2, i) + rand(0, 1000), 30000);
      await sleep(wait);
    }
  }
}

async function post(url, body, opts = {}) {
  const client = opts.client || createClient(opts);
  const { data } = await client.post(url, body, {
    headers: { 'Content-Type': opts.contentType || 'application/x-www-form-urlencoded' },
    responseType: opts.responseType || 'text',
  });
  return data;
}

function load(html) {
  return cheerio.load(html);
}

async function scrapeMeta(url, opts = {}) {
  const html = await fetch(url, { ...opts, cookieJar: false });
  const $ = load(html);
  return { url, meta: getAllMeta($), title: $('title').text().trim(), og: getOG($) };
}

const AGENTS_PREMIUM = [
  ...AGENTS,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

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

function extractNumbers(text) {
  return [...new Set(text.match(/[\d\s.,]+/g) || [])].filter(s => s.replace(/\s/g, '').length > 2);
}

function isBlocked(html) {
  const signals = [
    'checkpoint', 'block', 'captcha', 'access denied', 'please wait',
    'automated requests', 'unusual traffic', 'verify you are human',
    'just a moment', 'cf-browser-verify', 'attention required',
    'you have been blocked', 'too many requests', '429',
  ];
  const lower = html.toLowerCase();
  return signals.some(s => lower.includes(s));
}

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

function createSession(opts = {}) {
  const client = createClient({ ...opts, cookieJar: true });
  let lastRequest = 0;

  return {
    client,
    async get(url, reqOpts = {}) {
      const now = Date.now();
      const elapsed = now - lastRequest;
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      if (elapsed < minGap) await sleep(minGap - elapsed);
      lastRequest = Date.now();
      return fetch(url, { ...reqOpts, client });
    },
    async post(url, body, reqOpts = {}) {
      const now = Date.now();
      const elapsed = now - lastRequest;
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      if (elapsed < minGap) await sleep(minGap - elapsed);
      lastRequest = Date.now();
      return post(url, body, { ...reqOpts, client });
    },
  };
}

module.exports = {
  parseNumber, shuffle, shuffleObjectKeys, rand, sleep, randomDelay, pick,
  getMeta, getAllMeta, getOG, getText, getLines, matchText, stripHTML,
  extractLinks, extractImages, extractScripts, extractEmails, extractNumbers,
  isBlocked, saveJSON, loadJSON, log, buildUA, buildHeaders, buildSecChUa,
  fetch, fetchWithRetry, post, createClient, createSession, load, scrapeMeta,
  AGENTS, AGENTS_PREMIUM, REFERERS, LANGUAGES,
};
