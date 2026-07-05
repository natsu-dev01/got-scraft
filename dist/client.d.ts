import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { BuildHeadersOptions } from './headers';
import { Throttler, ProxyRotator } from './anti';
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
    request(config: AxiosRequestConfig & {
        url: string;
    }): Promise<AxiosResponse>;
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
export declare function createClient(opts?: ClientOptions): AxiosInstance;
export declare function resolveUrl(input: string): {
    url: string;
    platform?: string;
};
export declare function isValidUrl(url: string): boolean;
export declare function createSession(opts?: ClientOptions): Session;
//# sourceMappingURL=client.d.ts.map