import crypto from 'node:crypto';
import pkg from '../package.json';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

import { fetch, fetchWithRetry, post } from './http';
import type { FetchOptions, RetryOptions } from './http';
import { createClient, createSession, resolveUrl, isValidUrl } from './client';
import type { ClientOptions, Session } from './client';
import {
  load, getMeta, getAllMeta, getOG,
  getText, getLines, matchText, stripHTML, parseNumber,
} from './parser';
import type { LoadOptions, MatchResult } from './parser';
import {
  extractLinks, extractImages, extractScripts, extractStyles,
  extractEmails, extractIFrames, extractForms, extractJsonLd,
} from './extract';
import type { FormData } from './extract';
import {
  buildHeaders, buildSecChUa,
  PROFILES, AGENTS, REFERERS, LANGUAGES,
} from './headers';
import type { BuildHeadersOptions, DeviceProfile } from './headers';
import {
  ProxyRotator, Throttler, cacheBust, isBlocked, inspectResponse,
} from './anti';
import type { InspectResult } from './anti';
import {
  cookiesFromFile, cookiesFromNetscape, cookiesFromBrowser,
  cookiesToHeader, mergeCookies,
} from './cookies';
import {
  rand, pick, shuffle, shuffleObjectKeys,
  sleep, randomDelay, saveJSON, loadJSON, log,
} from './utils';
import {
  buildFbHeaders, toMobileUrl, toGraphApiUrl,
  parseMbasicContent, extractFacebookVideo,
  extractFacebookPostId, extractPageName,
} from './facebook';
import type { FbContent } from './facebook';
import {
  getVideoInfo, getAudioUrl, getVideoUrl, getDirectUrl, download,
  ensureAria2c, extractYouTubeId,
} from './youtube';
import type { YouTubeVideoInfo, YouTubeFormat, YouTubeOptions } from './youtube';

const INTEGRITY: Record<string, string> = {
  '2.0.0': '515c8e83f6020ea5e23abe7e9bcdef0bd3565cd81d43f6d48cce7d1dc48ff79a',
  '2.1.0': '7d58bff27aa800a01a92bd50bc5c421f00fc67ebe911472f53bf37a12347a967',
};

export interface MetaResult {
  url: string;
  title: string;
  meta: Record<string, string>;
  og: Record<string, string>;
}

export async function scrapeMeta(url: string, opts: FetchOptions = {}): Promise<MetaResult> {
  const html = await fetch(url, { ...opts, cookieJar: false });
  const $ = load(html);
  return {
    url,
    meta: getAllMeta($),
    title: $('title').text().trim(),
    og: getOG($),
  };
}

export interface FbResult {
  success: boolean;
  source: string;
  content: FbContent | Record<string, unknown> | null;
  error?: string;
}

export async function scrapeFacebook(url: string, opts: ClientOptions & { tryGraphApi?: boolean } = {}): Promise<FbResult> {
  const client = createClient({
    headers: buildFbHeaders('mobile'),
    timeout: 15000,
    cookieJar: true,
  });

  interface Strategy {
    name: string;
    url: string;
    headers: Record<string, string>;
    raw?: boolean;
  }

  const strategies: Strategy[] = [];

  strategies.push({
    name: 'mbasic',
    url: toMobileUrl(url),
    headers: buildFbHeaders('mobile'),
  });

  strategies.push({
    name: 'desktop',
    url: url,
    headers: buildFbHeaders('desktop'),
  });

  strategies.push({
    name: 'desktop-raw',
    url: url,
    headers: buildFbHeaders('desktop'),
    raw: true,
  });

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

  let best: { name: string; content: FbContent | Record<string, unknown> | null } | null = null;

  for (const strategy of strategies) {
    try {
      const { data } = await client.get(strategy.url, {
        headers: strategy.headers,
        responseType: 'text',
      });

      if (strategy.name === 'graph') {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return {
          success: true,
          source: 'graph',
          content: parsed,
        };
      }

      if (strategy.raw) {
        const videos: string[] = [];
        const hdMatch = data.match(/browser_native_hd_url"\s*:\s*"([^"]+)"/);
        const sdMatch = data.match(/browser_native_sd_url"\s*:\s*"([^"]+)"/);
        const pbMatch = data.match(/playable_url"\s*:\s*"([^"]+)"/);
        if (hdMatch) videos.push(hdMatch[1].replace(/\\\//g, '/'));
        if (sdMatch) videos.push(sdMatch[1].replace(/\\\//g, '/'));
        if (pbMatch) videos.push(pbMatch[1].replace(/\\\//g, '/'));

        if (videos.length > 0) {
          const parsed = parseMbasicContent(data);
          parsed.videos = [...videos, ...parsed.videos];
          best = { name: strategy.name, content: parsed };
          break;
        }
        continue;
      }

      const parsed = parseMbasicContent(data);

      if (parsed.error === 'blocked') {
        continue;
      }

      if (parsed.videos.length > 0 || !best) {
        best = { name: strategy.name, content: parsed };
      }

      if (parsed.videos.length > 0) break;
    } catch {
      continue;
    }
  }

  if (best) {
    return { success: true, source: best.name, content: best.content };
  }

  return {
    success: false,
    source: 'none',
    content: null,
    error: 'All Facebook strategies failed (blocked or unreachable)',
  };
}

export type Platform = 'facebook' | 'youtube' | 'twitter' | 'tiktok' | 'instagram' | 'generic';

const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  facebook: [
    /facebook\.com\//,
    /fb\.com\//,
    /fb\.watch\//,
  ],
  youtube: [
    /youtube\.com\//,
    /youtu\.be\//,
  ],
  twitter: [
    /twitter\.com\//,
    /x\.com\//,
    /t\.co\//,
  ],
  tiktok: [
    /tiktok\.com\//,
    /vm\.tiktok\//,
  ],
  instagram: [
    /instagram\.com\//,
    /instagr\.am\//,
  ],
  generic: [],
};

export function detectPlatform(url: string): Platform {
  const { url: cleanUrl, platform } = resolveUrl(url);
  if (platform) return platform as Platform;

  for (const [platformName, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (platformName === 'generic') continue;
    for (const p of patterns) {
      if (p.test(cleanUrl)) return platformName as Platform;
    }
  }

  return 'generic';
}

export interface ScrapeResult {
  url: string;
  platform: Platform;
  success: boolean;
  data: Record<string, unknown> | string | null;
  error?: string;
}

export async function scrapeUrl(url: string, opts: ClientOptions & { tryGraphApi?: boolean } = {}): Promise<ScrapeResult> {
  const { url: cleanUrl, platform: prefixPlatform } = resolveUrl(url);
  const platform: Platform = prefixPlatform ? (prefixPlatform as Platform) : detectPlatform(cleanUrl);

  try {
    if (platform === 'facebook') {
      const fbResult = await scrapeFacebook(cleanUrl, opts);
      return {
        url: cleanUrl,
        platform,
        success: fbResult.success,
        data: fbResult.content as Record<string, unknown> | null,
        error: fbResult.error,
      };
    }

    if (platform === 'youtube') {
      const ytResult = await getVideoInfo(cleanUrl);
      return {
        url: cleanUrl,
        platform,
        success: true,
        data: ytResult as unknown as Record<string, unknown>,
      };
    }

    const html = await fetch(cleanUrl, { ...opts, cookieJar: false });
    const $ = load(html);
    const meta = getAllMeta($);
    const og = getOG($);

    return {
      url: cleanUrl,
      platform,
      success: true,
      data: {
        title: $('title').text().trim(),
        meta,
        og,
        links: extractLinks($, cleanUrl),
        images: extractImages($, cleanUrl),
        jsonLd: extractJsonLd($),
      },
    };
  } catch (err) {
    return {
      url: cleanUrl,
      platform,
      success: false,
      data: null,
      error: (err as Error).message,
    };
  }
}

export interface VerifyResult {
  ok: boolean;
  version: string;
  hash?: string;
  expected?: string;
  error?: string;
}

export function verify(): VerifyResult {
  const fs = require('node:fs');
  const path = require('node:path');
  const integrityFile = path.join(__dirname, '.integrity');

  let expected: string | null = null;
  try {
    expected = fs.readFileSync(integrityFile, 'utf-8').trim();
  } catch {
    // Fallback to hardcoded INTEGRITY map
    expected = INTEGRITY[pkg.version] || null;
  }

  if (!expected) {
    return { ok: false, version: pkg.version, error: 'No integrity hash for this version' };
  }

  const mainFile = path.join(__dirname, 'index.js');
  const content = fs.readFileSync(mainFile);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  return { ok: hash === expected, version: pkg.version, hash, expected };
}

export const version: string = pkg.version;

export {
  // Información del módulo
  pkg as packageInfo,
  INTEGRITY as integrityMap,

  // HTTP
  fetch, fetchWithRetry, post, createClient, createSession,

  // URL helpers
  resolveUrl, isValidUrl,

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

  // Facebook helpers
  buildFbHeaders, toMobileUrl, toGraphApiUrl,
  parseMbasicContent, extractFacebookVideo,
  extractFacebookPostId, extractPageName,

  // YouTube
  getVideoInfo, getAudioUrl, getVideoUrl, getDirectUrl, download,
  ensureAria2c, extractYouTubeId,
};

export type {
  YouTubeVideoInfo,
  YouTubeFormat,
  YouTubeOptions,
};

// Type exports for consumers
export type {
  AxiosInstance,
  AxiosRequestConfig,
  FetchOptions,
  RetryOptions,
  ClientOptions,
  Session,
  LoadOptions,
  MatchResult,
  FormData,
  BuildHeadersOptions,
  DeviceProfile,
  InspectResult,
  FbContent,
};
