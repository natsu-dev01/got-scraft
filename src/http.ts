import { createClient } from './client';
import { cacheBust } from './anti';
import { randomDelay, sleep, rand } from './utils';
import type { AxiosInstance } from 'axios';
import type { Throttler, ProxyRotator } from './anti';

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
}

export interface RetryOptions extends FetchOptions {
  retries?: number;
  retryDelay?: number;
  rotateOnError?: boolean;
  proxyRotator?: ProxyRotator;
}

export async function fetch(url: string, opts: FetchOptions = {}): Promise<string> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  if (opts.delay) {
    await randomDelay(opts.delayMin || 500, opts.delayMax || 2000);
  }

  if (opts.throttler) {
    await opts.throttler.wait();
  }

  const { data } = await client.get(finalUrl, {
    responseType: opts.responseType || 'text',
  });

  return data;
}

export async function fetchWithRetry(url: string, opts: RetryOptions = {}): Promise<string> {
  const maxRetries = opts.retries || 3;
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

      const { data } = await client.get(finalUrl, {
        responseType: opts.responseType || 'text',
      });

      return data;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      if (opts.proxyRotator && opts.rotateOnError !== false) {
        const nextProxy = opts.proxyRotator.next();
        if (nextProxy) {
          const parsed = opts.proxyRotator.parse(nextProxy);

          if (typeof parsed === 'string') {
            client.defaults.httpsAgent = opts.proxyRotator.getAgent(nextProxy) as any;
            delete client.defaults.proxy;
          } else {
            client.defaults.proxy = parsed as any;
            delete client.defaults.httpsAgent;
          }
        }
      }

      const waitTime = Math.min(
        1000 * Math.pow(2, attempt) + rand(0, 2000),
        30000
      );

      await sleep(waitTime);
    }
  }

  throw new Error('fetchWithRetry: all retries failed');
}

export async function post(url: string, body: unknown, opts: FetchOptions = {}): Promise<string> {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  if (opts.throttler) {
    await opts.throttler.wait();
  }

  const { data } = await client.post(finalUrl, body, {
    headers: {
      'Content-Type': opts.headers?.['Content-Type'] || 'application/x-www-form-urlencoded',
    },
    responseType: opts.responseType || 'text',
  });

  return data;
}
