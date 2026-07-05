import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { buildHeaders } from './headers';
import type { BuildHeadersOptions, DeviceProfile } from './headers';
import { cacheBust, Throttler, ProxyRotator } from './anti';
import { sleep } from './utils';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export interface ClientOptions extends BuildHeadersOptions {
  timeout?: number;
  cookieJar?: boolean;
  cookieFile?: string;
  proxy?: Record<string, unknown> | string;
  proxyRotator?: ProxyRotator;
  httpsAgent?: HttpsProxyAgent<string> | SocksProxyAgent;
  httpAgent?: unknown;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
  minGap?: number;
  maxRPM?: number;
  throttler?: Throttler;
}

export interface Session {
  client: AxiosInstance;
  throttler: Throttler;
  rotator: ProxyRotator | null;
  get(url: string, reqOpts?: { responseType?: string; minGap?: number; cacheBust?: boolean }): Promise<string>;
  post(url: string, body: unknown, reqOpts?: { responseType?: string; minGap?: number; contentType?: string }): Promise<string>;
  rotateProxy(): void;
}

export function createClient(opts: ClientOptions = {}): AxiosInstance {
  const config: AxiosRequestConfig = {
    timeout: opts.timeout || 30000,
    headers: buildHeaders(opts),
    decompress: true,
    maxRedirects: opts.maxRedirects || 5,
    validateStatus: opts.validateStatus || (status => status < 500),
  };

  if (opts.proxy) {
    if (typeof opts.proxy === 'string') {
      const rotator = new ProxyRotator();
      const parsed = rotator.parse(opts.proxy);
      if (typeof parsed === 'string') {
        config.httpsAgent = new HttpsProxyAgent(parsed);
      } else {
        config.proxy = parsed;
      }
    } else {
      config.proxy = opts.proxy as any;
    }
  }

  if (opts.httpsAgent) config.httpsAgent = opts.httpsAgent;
  if (opts.httpAgent) config.httpAgent = opts.httpAgent as any;

  if (opts.cookieJar !== false) {
    try {
      const tough = require('tough-cookie');
      (config as any).jar = new tough.CookieJar();
      (config as any).withCredentials = true;
    } catch {
      // tough-cookie no instalado
    }
  }

  if (opts.cookieFile) {
    try {
      const { cookiesFromFile } = require('./cookies');
      const cookie = cookiesFromFile(opts.cookieFile);
      if (cookie && config.headers) {
        (config.headers as Record<string, string>).Cookie = cookie;
      }
    } catch {
      // Error al leer cookies
    }
  }

  const client = axios.create(config);

  if (opts.cookieJar !== false) {
    try {
      require('axios-cookiejar-support')(client);
    } catch {
      // axios-cookiejar-support no instalado
    }
  }

  return client;
}

const PLATFORM_PREFIXES: Record<string, string> = {
  '.fb': 'facebook',
  '.facebook': 'facebook',
  '.yt': 'youtube',
  '.youtube': 'youtube',
  '.tw': 'twitter',
  '.x': 'twitter',
  '.tiktok': 'tiktok',
  '.ig': 'instagram',
  '.instagram': 'instagram',
};

export function resolveUrl(input: string): { url: string; platform?: string } {
  const trimmed = input.trim();
  for (const [prefix, platform] of Object.entries(PLATFORM_PREFIXES)) {
    if (trimmed.startsWith(prefix + ' ')) {
      return { url: trimmed.slice(prefix.length + 1).trim(), platform };
    }
  }
  return { url: trimmed };
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function createSession(opts: ClientOptions = {}): Session {
  const client = createClient({ ...opts, cookieJar: opts.cookieJar !== false });
  const throttler = opts.throttler || new Throttler(opts.maxRPM || 30);
  const rotator = opts.proxyRotator || null;
  let lastRequest = 0;

  return {
    client,
    throttler,
    rotator,

    async get(url: string, reqOpts: { responseType?: string; minGap?: number; cacheBust?: boolean } = {}) {
      const { url: cleanUrl } = resolveUrl(url);
      if (!isValidUrl(cleanUrl)) {
        throw new Error(`Invalid URL: "${cleanUrl}"`);
      }

      await throttler.wait();

      const now = Date.now();
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      const elapsed = now - lastRequest;

      if (elapsed < minGap) {
        await sleep(minGap - elapsed);
      }

      lastRequest = Date.now();
      const finalUrl = reqOpts.cacheBust !== false ? cacheBust(cleanUrl) : cleanUrl;
      const { data } = await client.get(finalUrl, {
        responseType: (reqOpts.responseType || 'text') as any,
      });

      return data;
    },

    async post(url: string, body: unknown, reqOpts: { responseType?: string; minGap?: number; contentType?: string } = {}) {
      const { url: cleanUrl } = resolveUrl(url);
      if (!isValidUrl(cleanUrl)) {
        throw new Error(`Invalid URL: "${cleanUrl}"`);
      }

      await throttler.wait();

      const now = Date.now();
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      const elapsed = now - lastRequest;

      if (elapsed < minGap) {
        await sleep(minGap - elapsed);
      }

      lastRequest = Date.now();
      const { data } = await client.post(cleanUrl, body, {
        headers: { 'Content-Type': reqOpts.contentType || 'application/x-www-form-urlencoded' },
        responseType: (reqOpts.responseType || 'text') as any,
      });

      return data;
    },

    rotateProxy() {
      if (!this.rotator) return;

      const next = this.rotator.next();
      if (!next) return;

      const parsed = this.rotator.parse(next);

      if (typeof parsed === 'string') {
        client.defaults.httpsAgent = this.rotator.getAgent(next) as any;
        delete client.defaults.proxy;
      } else {
        client.defaults.proxy = parsed as any;
        delete client.defaults.httpsAgent;
      }
    },
  };
}
