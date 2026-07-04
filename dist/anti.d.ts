import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
interface ProxyConfigObj {
    host: string;
    port: number;
    protocol: string;
}
export declare class ProxyRotator {
    private _proxies;
    private _index;
    constructor(proxies?: string[]);
    loadFromFile(filePath: string): this;
    loadFromArray(arr: string[]): this;
    add(proxy: string): this;
    next(): string | null;
    random(): string | null;
    parse(proxyStr: string): ProxyConfigObj | string;
    getAgent(proxyStr: string): HttpsProxyAgent<string> | SocksProxyAgent | null;
    nextAgent(): HttpsProxyAgent<string> | SocksProxyAgent | null;
    randomAgent(): HttpsProxyAgent<string> | SocksProxyAgent | null;
    get count(): number;
}
export declare class Throttler {
    private _maxRPM;
    private _timestamps;
    constructor(maxRPM?: number);
    wait(): Promise<void>;
    set max(val: number);
    get max(): number;
}
export declare function cacheBust(url: string): string;
export declare function isBlocked(html: string): boolean;
export interface InspectResult {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    blocked: boolean;
    redirected: boolean;
    finalUrl?: string;
    size: string;
}
export declare function inspectResponse(response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data?: {
        length: number;
    } | string;
    request?: {
        res?: {
            responseUrl?: string;
        };
    };
    config?: {
        url?: string;
    };
}): InspectResult;
export {};
//# sourceMappingURL=anti.d.ts.map