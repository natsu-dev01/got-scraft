export declare const FB_MOBILE_HEADERS: Record<string, string>;
export declare const FB_DESKTOP_HEADERS: Record<string, string>;
export declare const FB_GRAPH_HEADERS: Record<string, string>;
export declare const FB_COOKIE_BASE = "sb=abc123; datr=xyz789; reg_ext_ref=deleted; fr=0; presence=C%7B%22t3%22%3A%5B%5D%7D";
export declare function extractFacebookVideo(url: string): string | null;
export declare function extractFacebookPostId(url: string): string | null;
export declare function extractPageName(url: string): string | null;
export declare function toMobileUrl(url: string): string;
export declare function toGraphApiUrl(url: string): string | null;
export declare function buildFbHeaders(type?: 'mobile' | 'desktop' | 'graph', additional?: Record<string, string>): Record<string, string>;
export interface FbContent {
    text: string | null;
    images: string[];
    videos: string[];
    links: string[];
    error: string | null;
}
export declare function parseMbasicContent(html: string): FbContent;
//# sourceMappingURL=facebook.d.ts.map