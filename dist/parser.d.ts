import cheerio from 'cheerio';
export interface LoadOptions {
    encoding?: string;
    autoDetect?: boolean;
}
export interface MatchResult {
    match: string;
    capture: string | null;
}
export declare function load(html: string, opts?: LoadOptions): cheerio.CheerioAPI;
export declare function getMeta($: cheerio.CheerioAPI, prop: string): string;
export declare function getAllMeta($: cheerio.CheerioAPI): Record<string, string>;
export declare function getOG($: cheerio.CheerioAPI): Record<string, string>;
export declare function getText($: cheerio.CheerioAPI): string;
export declare function getLines($: cheerio.CheerioAPI): string[];
export declare function matchText(text: string, patterns: RegExp[]): MatchResult | null;
export declare function stripHTML(html: string): string;
export declare function parseNumber(str: string): string | null;
//# sourceMappingURL=parser.d.ts.map