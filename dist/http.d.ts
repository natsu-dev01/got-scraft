import type { AxiosInstance, AxiosResponse } from 'axios';
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
declare function applyDelay(opts: FetchOptions): Promise<void>;
declare function applyThrottle(opts: FetchOptions): Promise<void>;
export declare function fetch(url: string, opts?: FetchOptions): Promise<string>;
export declare function fetchRaw(url: string, opts?: FetchOptions): Promise<AxiosResponse>;
export declare function fetchWithRetry(url: string, opts?: RetryOptions): Promise<string>;
export declare function post(url: string, body: unknown, opts?: FetchOptions & {
    contentType?: string;
}): Promise<string>;
export declare function put(url: string, body: unknown, opts?: FetchOptions & {
    contentType?: string;
}): Promise<string>;
export declare function patch(url: string, body: unknown, opts?: FetchOptions & {
    contentType?: string;
}): Promise<string>;
export declare function del(url: string, opts?: FetchOptions): Promise<string>;
export declare function head(url: string, opts?: FetchOptions): Promise<AxiosResponse>;
export declare function fetchStream(url: string, opts?: FetchOptions): Promise<import('stream').Readable>;
export declare function downloadFile(url: string, destPath: string, opts?: FetchOptions & {
    onProgress?: (downloaded: number, total: number) => void;
}): Promise<string>;
export { applyDelay, applyThrottle, };
//# sourceMappingURL=http.d.ts.map