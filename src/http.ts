import { createClient } from './client';
import { cacheBust, isBlocked } from './anti';
import { randomDelay, sleep, rand } from './utils';
import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import type { Throttler, ProxyRotator } from './anti';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import * as http from 'node:http';

export interface FetchOptions {
  client?: AxiosInstance;
  cacheBust?: boolean;
  delay?: boolean;
  delayMin?: number;
  delayMax?: number;
  throttler?: Throttler;
  responseType?: 'text' | 'arraybuffer' | 'stream';
  headers?: Record<string, string>;
  timeout?: number;
  userAgent?: string;
  lang?: string;
  referer?: string;
  cookieJar?: boolean;
  params?: Record<string, string>;
  responseEncoding?: string;
  signal?: AbortSignal;
}

export interface RetryOptions extends FetchOptions {
  retries?: number;
  retryDelay?: number;
  retryOnStatus?: number[];
  rotateOnError?: boolean;
  proxyRotator?: ProxyRotator;
  maxRetryDelay?: number;
}

const DEFAULT_RETRY_STATUSES = [429, 503, 502, 500];

function applyDelay(opts: FetchOptions): Promise<void> {
  if (opts.delay) {
    return randomDelay(opts.delayMin || 500, opts.delayMax || 2000);
  }
  return Promise.resolve();
}

function applyThrottle(opts: FetchOptions): Promise<void> {
  if (opts.throttler) {
    return opts.throttler.wait();
  }
  return Promise.resolve();
}

function buildRequestConfig(opts: FetchOptions): Partial<AxiosRequestConfig> {
  const config: Partial<AxiosRequestConfig> = {
    responseType: opts.responseType || 'text',
  };
  if (opts.headers) config.headers = opts.headers;
  if (opts.timeout) config.timeout = opts.timeout;
  if (opts.params) config.params = opts.params;
  if (opts.responseEncoding) config.responseEncoding = opts.responseEncoding;
  if (opts.signal) config.signal = opts.signal;
  return config;
}

export async function fetch(url: string, opts: FetchOptions = {}): Promise<string> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyDelay(opts);
  await applyThrottle(opts);

  const { data } = await client.get(finalUrl, buildRequestConfig(opts));
  return data;
}

export async function fetchRaw(url: string, opts: FetchOptions = {}): Promise<AxiosResponse> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyDelay(opts);
  await applyThrottle(opts);

  return client.get(finalUrl, buildRequestConfig(opts));
}

export async function fetchWithRetry(url: string, opts: RetryOptions = {}): Promise<string> {
  const maxRetries = opts.retries || 3;
  const retryStatuses = opts.retryOnStatus || DEFAULT_RETRY_STATUSES;
  const client = opts.client || createClient({ ...opts, cookieJar: false });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const finalUrl = opts.cacheBust ? cacheBust(url) : url;

      if (opts.throttler) {
        await opts.throttler.wait();
      }

      if (opts.delay && attempt > 0) {
        await randomDelay(opts.delayMin || 1000, opts.delayMax || 3000);
      }

      const config = buildRequestConfig(opts);
      const response = await client.get(finalUrl, config);

      if (retryStatuses.includes(response.status) && attempt < maxRetries - 1) {
        const waitTime = calcBackoff(attempt, opts.retryDelay, opts.maxRetryDelay);
        await sleep(waitTime);
        continue;
      }

      return response.data;
    } catch (error: any) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      if (error.response && retryStatuses.includes(error.response.status)) {
        const waitTime = calcBackoff(attempt, opts.retryDelay, opts.maxRetryDelay);
        await sleep(waitTime);
        continue;
      }

      if (opts.proxyRotator && opts.rotateOnError !== false) {
        rotateClientProxy(client, opts.proxyRotator);
      }

      const waitTime = calcBackoff(attempt, opts.retryDelay, opts.maxRetryDelay);
      await sleep(waitTime);
    }
  }

  throw new Error('fetchWithRetry: all retries failed');
}

function calcBackoff(attempt: number, baseDelay?: number, maxDelay?: number): number {
  const base = baseDelay || 1000;
  const max = maxDelay || 30000;
  return Math.min(base * Math.pow(2, attempt) + rand(0, 2000), max);
}

function rotateClientProxy(client: AxiosInstance, rotator: ProxyRotator): void {
  const nextProxy = rotator.next();
  if (!nextProxy) return;
  const parsed = rotator.parse(nextProxy);
  if (typeof parsed === 'string') {
    client.defaults.httpsAgent = rotator.getAgent(nextProxy) as any;
    delete (client.defaults as any).proxy;
  } else {
    (client.defaults as any).proxy = parsed as any;
    delete client.defaults.httpsAgent;
  }
}

export async function post(url: string, body: unknown, opts: FetchOptions & { contentType?: string } = {}): Promise<string> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyDelay(opts);
  await applyThrottle(opts);

  const contentType = opts.contentType || opts.headers?.['Content-Type'] || autoDetectContentType(body);
  const config = buildRequestConfig(opts);
  config.headers = {
    'Content-Type': contentType,
    ...opts.headers,
  };

  const { data } = await client.post(finalUrl, body, config);
  return data;
}

function autoDetectContentType(body: unknown): string {
  if (typeof body === 'string') {
    try {
      JSON.parse(body);
      return 'application/json';
    } catch {
      return 'application/x-www-form-urlencoded';
    }
  }
  if (body instanceof FormData || body instanceof URLSearchParams) {
    return 'multipart/form-data';
  }
  if (body && typeof body === 'object') {
    return 'application/json';
  }
  return 'application/x-www-form-urlencoded';
}

export async function put(url: string, body: unknown, opts: FetchOptions & { contentType?: string } = {}): Promise<string> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyDelay(opts);
  await applyThrottle(opts);

  const contentType = opts.contentType || opts.headers?.['Content-Type'] || autoDetectContentType(body);
  const config = buildRequestConfig(opts);
  config.headers = {
    'Content-Type': contentType,
    ...opts.headers,
  };

  const { data } = await client.put(finalUrl, body, config);
  return data;
}

export async function patch(url: string, body: unknown, opts: FetchOptions & { contentType?: string } = {}): Promise<string> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyDelay(opts);
  await applyThrottle(opts);

  const contentType = opts.contentType || opts.headers?.['Content-Type'] || autoDetectContentType(body);
  const config = buildRequestConfig(opts);
  config.headers = {
    'Content-Type': contentType,
    ...opts.headers,
  };

  const { data } = await client.patch(finalUrl, body, config);
  return data;
}

export async function del(url: string, opts: FetchOptions = {}): Promise<string> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyDelay(opts);
  await applyThrottle(opts);

  const { data } = await client.delete(finalUrl, buildRequestConfig(opts));
  return data;
}

export async function head(url: string, opts: FetchOptions = {}): Promise<AxiosResponse> {
  const client = opts.client || createClient({ ...opts, cookieJar: false });
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyThrottle(opts);

  return client.head(finalUrl, {
    headers: opts.headers,
    timeout: opts.timeout,
  });
}

export async function fetchStream(url: string, opts: FetchOptions = {}): Promise<import('stream').Readable> {
  const client = opts.client || createClient({ ...opts, cookieJar: false });
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  await applyDelay(opts);
  await applyThrottle(opts);

  const response = await client.get(finalUrl, {
    ...buildRequestConfig(opts),
    responseType: 'stream',
  });

  return response.data;
}

export async function downloadFile(
  url: string,
  destPath: string,
  opts: FetchOptions & { onProgress?: (downloaded: number, total: number) => void } = {}
): Promise<string> {
  const resolved = path.resolve(destPath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const response = await fetchRaw(url, { ...opts, responseType: 'stream' });

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(resolved);
    const total = parseInt(String(response.headers['content-length'] ?? '0'), 10);
    let downloaded = 0;

    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (opts.onProgress) {
        opts.onProgress(downloaded, total);
      }
    });

    response.data.pipe(file);

    file.on('finish', () => {
      file.close();
      resolve(resolved);
    });

    file.on('error', (err) => {
      file.close();
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
      reject(err);
    });
  });
}

export {
  applyDelay,
  applyThrottle,
};
