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
export declare function fetch(url: string, opts?: FetchOptions): Promise<string>;
export declare function fetchWithRetry(url: string, opts?: RetryOptions): Promise<string>;
export declare function post(url: string, body: unknown, opts?: FetchOptions): Promise<string>;
//# sourceMappingURL=http.d.ts.map