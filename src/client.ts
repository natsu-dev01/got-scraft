import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
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
  requestInterceptor?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  responseInterceptor?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  errorInterceptor?: (error: any) => any;
}

export interface Session {
  client: AxiosInstance;
  throttler: Throttler;
  rotator: ProxyRotator | null;
  get(url: string, reqOpts?: SessionReqOpts): Promise<string>;
  post(url: string, body: unknown, reqOpts?: SessionPostOpts): Promise<string>;
  head(url: string, reqOpts?: SessionReqOpts): Promise<AxiosResponse>;
  request(config: AxiosRequestConfig & { url: string }): Promise<AxiosResponse>;
  rotateProxy(): void;
}

export interface SessionReqOpts {
  responseType?: string;
  minGap?: number;
  cacheBust?: boolean;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface SessionPostOpts extends SessionReqOpts {
  contentType?: string;
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

  if (opts.requestInterceptor) {
    client.interceptors.request.use(opts.requestInterceptor);
  }

  if (opts.responseInterceptor) {
    client.interceptors.response.use(opts.responseInterceptor);
  }

  if (opts.errorInterceptor) {
    client.interceptors.response.use(undefined, opts.errorInterceptor);
  }

  return client;
}

const PLATFORM_PREFIXES: Record<string, string> = {
  '.fb': 'facebook',
  '.facebook': 'facebook',
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

    async get(url: string, reqOpts: SessionReqOpts = {}) {
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
        headers: reqOpts.headers,
        params: reqOpts.params,
        timeout: reqOpts.timeout,
        signal: reqOpts.signal,
      });

      return data;
    },

    async post(url: string, body: unknown, reqOpts: SessionPostOpts = {}) {
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
        headers: {
          'Content-Type': reqOpts.contentType || 'application/x-www-form-urlencoded',
          ...reqOpts.headers,
        },
        responseType: (reqOpts.responseType || 'text') as any,
        params: reqOpts.params,
        timeout: reqOpts.timeout,
        signal: reqOpts.signal,
      });

      return data;
    },

    async head(url: string, reqOpts: SessionReqOpts = {}) {
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
      return client.head(cleanUrl, {
        headers: reqOpts.headers,
        timeout: reqOpts.timeout,
        signal: reqOpts.signal,
      });
    },

    async request(config: AxiosRequestConfig & { url: string }) {
      const { url: cleanUrl } = resolveUrl(config.url);
      if (!isValidUrl(cleanUrl)) {
        throw new Error(`Invalid URL: "${cleanUrl}"`);
      }

      await throttler.wait();

      const now = Date.now();
      const minGap = opts.minGap || 2000;
      const elapsed = now - lastRequest;

      if (elapsed < minGap) {
        await sleep(minGap - elapsed);
      }

      lastRequest = Date.now();
      return client.request({ ...config, url: cleanUrl });
    },

    rotateProxy() {
      if (!this.rotator) return;

      const next = this.rotator.next();
      if (!next) return;

      const parsed = this.rotator.parse(next);

      if (typeof parsed === 'string') {
        client.defaults.httpsAgent = this.rotator.getAgent(next) as any;
        delete (client.defaults as any).proxy;
      } else {
        (client.defaults as any).proxy = parsed as any;
        delete client.defaults.httpsAgent;
      }
    },
  };
}
