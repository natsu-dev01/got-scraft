import fs from 'node:fs';
import path from 'node:path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { rand, pick, sleep } from './utils';

interface ProxyConfigObj {
  host: string;
  port: number;
  protocol: string;
}

export class ProxyRotator {
  private _proxies: string[] = [];
  private _index = 0;

  constructor(proxies: string[] = []) {
    this._proxies = proxies;
  }

  loadFromFile(filePath: string): this {
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      this._proxies = content.split('\n').map(l => l.trim()).filter(Boolean);
    } catch {
      // Archivo no encontrado, ignorar
    }
    return this;
  }

  loadFromArray(arr: string[]): this {
    this._proxies = [...arr];
    return this;
  }

  add(proxy: string): this {
    this._proxies.push(proxy);
    return this;
  }

  next(): string | null {
    if (!this._proxies.length) return null;
    const proxy = this._proxies[this._index % this._proxies.length];
    this._index++;
    return proxy;
  }

  random(): string | null {
    if (!this._proxies.length) return null;
    return pick(this._proxies);
  }

  parse(proxyStr: string): ProxyConfigObj | string {
    if (proxyStr.startsWith('socks4://') || proxyStr.startsWith('socks5://') || proxyStr.startsWith('http://')) {
      return proxyStr;
    }

    const parts = proxyStr.split(':');
    return {
      host: parts[0],
      port: parseInt(parts[1] || '8080', 10),
      protocol: 'http',
    };
  }

  getAgent(proxyStr: string): HttpsProxyAgent<string> | SocksProxyAgent | null {
    if (!proxyStr) return null;

    if (proxyStr.startsWith('socks4://') || proxyStr.startsWith('socks5://')) {
      return new SocksProxyAgent(proxyStr);
    }

    const fullUrl = proxyStr.startsWith('http') ? proxyStr : `http://${proxyStr}`;
    return new HttpsProxyAgent(fullUrl);
  }

  nextAgent(): HttpsProxyAgent<string> | SocksProxyAgent | null {
    const proxy = this.next();
    return proxy ? this.getAgent(proxy) : null;
  }

  randomAgent(): HttpsProxyAgent<string> | SocksProxyAgent | null {
    const proxy = this.random();
    return proxy ? this.getAgent(proxy) : null;
  }

  get count(): number {
    return this._proxies.length;
  }
}

export class Throttler {
  private _maxRPM: number;
  private _timestamps: number[] = [];

  constructor(maxRPM = 30) {
    this._maxRPM = maxRPM;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    this._timestamps = this._timestamps.filter(t => now - t < 60000);

    if (this._timestamps.length >= this._maxRPM) {
      const waitTime = this._timestamps[0] + 60000 - now;
      if (waitTime > 0) {
        await sleep(waitTime + rand(0, 2000));
      }
    }

    this._timestamps.push(Date.now());
  }

  set max(val: number) {
    this._maxRPM = val;
  }

  get max(): number {
    return this._maxRPM;
  }
}

export function cacheBust(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}${rand(100, 999)}`;
}

export function isBlocked(html: string): boolean {
  if (!html || typeof html !== 'string') return false;

  const signals = [
    'checkpoint', 'block', 'captcha', 'access denied', 'please wait',
    'automated requests', 'unusual traffic', 'verify you are human',
    'just a moment', 'cf-browser-verify', 'attention required',
    'you have been blocked', 'too many requests', '429',
    'your request has been blocked', 'sorry, you have been blocked',
    'our systems have detected unusual traffic', 'enter the code below',
    'security check', 'prove you\'re not a robot', 'js-challenge',
    'cf-challenge', 'ddos-guard', 'perimeterx', 'blocked because of malicious activity',
    'iniciar sesión', 'crear cuenta nueva', 'crear nueva cuenta',
    'log in', 'sign up', 'create new account',
  ];

  const normalized = html.toLowerCase();
  return signals.some(signal => normalized.includes(signal));
}

export interface InspectResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  blocked: boolean;
  redirected: boolean;
  finalUrl?: string;
  size: string;
}

export function inspectResponse(response: {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data?: { length: number } | string;
  request?: { res?: { responseUrl?: string } };
  config?: { url?: string };
}): InspectResult {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    blocked: [429, 403, 503].includes(response.status),
    redirected: response.request?.res?.responseUrl !== response.config?.url,
    finalUrl: response.request?.res?.responseUrl,
    size: String(response.data?.length || 0),
  };
}
