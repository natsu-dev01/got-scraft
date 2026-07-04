export interface DeviceProfile {
    ua: string;
    platform: string;
    mobile: string;
}
export declare const PROFILES: DeviceProfile[];
export declare const AGENTS: string[];
export declare const REFERERS: string[];
export declare const LANGUAGES: string[];
export declare function buildSecChUa(): string;
export interface BuildHeadersOptions {
    userAgent?: string;
    profile?: DeviceProfile;
    lang?: string;
    referer?: string;
    cacheBust?: boolean;
    randomizeHeaders?: boolean;
    headers?: Record<string, string>;
}
export declare function buildHeaders(opts?: BuildHeadersOptions): Record<string, string>;
//# sourceMappingURL=headers.d.ts.map