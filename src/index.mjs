import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../dist/index.js');

export const {
  version, verify,
  fetch, fetchRaw, fetchWithRetry, post, put, patch, del, head, fetchStream, downloadFile,
  createClient, createSession,
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
