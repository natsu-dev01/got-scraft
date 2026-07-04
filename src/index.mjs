import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('./index.js');

export const {
  fetch, fetchWithRetry, post, createClient, createSession,
  load, getMeta, getAllMeta, getOG, getText, getLines, matchText, stripHTML,
  extractLinks, extractImages, extractScripts, extractStyles,
  extractEmails, extractIFrames, extractForms, extractJsonLd,
  ProxyRotator, Throttler, cacheBust, isBlocked, inspectResponse,
  buildHeaders, buildSecChUa, PROFILES, AGENTS, REFERERS, LANGUAGES,
  cookiesFromFile, cookiesFromNetscape, cookiesFromBrowser, cookiesToHeader, mergeCookies,
  rand, pick, shuffle, shuffleObjectKeys, sleep, randomDelay,
  saveJSON, loadJSON, log, parseNumber,
  scrapeMeta,
  scrapeFacebook,
  buildFbHeaders, toMobileUrl, toGraphApiUrl,
  parseMbasicContent, extractFacebookVideo,
  extractFacebookPostId, extractPageName,
} = mod;

export default mod;
