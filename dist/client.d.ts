import type { AxiosInstance } from 'axios';
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
}
export interface Session {
    client: AxiosInstance;
    throttler: Throttler;
    rotator: ProxyRotator | null;
    get(url: string, reqOpts?: {
        responseType?: string;
        minGap?: number;
        cacheBust?: boolean;
    }): Promise<string>;
    post(url: string, body: unknown, reqOpts?: {
        responseType?: string;
        minGap?: number;
        contentType?: string;
    }): Promise<string>;
    rotateProxy(): void;
}
export declare function createClient(opts?: ClientOptions): AxiosInstance;
export declare function createSession(opts?: ClientOptions): Session;
//# sourceMappingURL=client.d.ts.map