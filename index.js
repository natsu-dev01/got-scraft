const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
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

function getText($) {
  return $('body').text().replace(/\s+/g, ' ').trim();
}

function getLines($) {
  return getText($).split('\n').map(l => l.trim()).filter(Boolean);
}

function matchText(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1]?.trim() || m[0]?.trim();
  }
  return null;
}

const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function createClient(opts = {}) {
  const client = axios.create({
    timeout: opts.timeout || 30000,
    headers: {
      'User-Agent': opts.userAgent || pick(AGENTS),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': opts.lang || 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': opts.referer || 'https://www.google.com/',
      ...opts.headers,
    },
    ...(opts.proxy ? { proxy: opts.proxy } : {}),
  });

  if (opts.cookieFile) {
    try {
      const cookie = fs.readFileSync(path.resolve(opts.cookieFile), 'utf8').trim();
      if (cookie) client.defaults.headers.Cookie = cookie;
    } catch {}
  }

  return client;
}

async function fetch(url, opts = {}) {
  const client = opts.client || createClient(opts);
  const { data } = await client.get(url);
  return data;
}

async function fetchWithRetry(url, opts = {}) {
  const maxRetries = opts.retries || 3;
  const client = opts.client || createClient(opts);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data } = await client.get(url);
      return data;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(opts.retryDelay || 2000 + rand(0, 2000));
    }
  }
}

function load(html) {
  return cheerio.load(html);
}

async function scrapeMeta(url, opts = {}) {
  const html = await fetch(url, opts);
  const $ = load(html);
  return { url, meta: getAllMeta($), title: $('title').text().trim() };
}

function saveJSON(data, filePath) {
  fs.writeFileSync(path.resolve(filePath), JSON.stringify(data, null, 2));
  return filePath;
}

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

module.exports = {
  parseNumber, shuffle, rand, sleep, pick,
  getMeta, getAllMeta, getText, getLines, matchText,
  fetch, fetchWithRetry, createClient, load, scrapeMeta,
  saveJSON, loadJSON,
  axios, cheerio, AGENTS,
};
