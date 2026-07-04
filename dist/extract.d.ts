import type { CheerioAPI } from 'cheerio';
export interface FormField {
    name: string;
    type: string;
    value: string;
}
export interface FormData {
    action: string;
    method: string;
    inputs: FormField[];
}
export declare function extractLinks($: CheerioAPI, baseUrl: string): string[];
export declare function extractImages($: CheerioAPI, baseUrl: string): string[];
export declare function extractScripts($: CheerioAPI, baseUrl: string): string[];
export declare function extractStyles($: CheerioAPI, baseUrl: string): string[];
export declare function extractEmails(text: string): string[];
export declare function extractIFrames($: CheerioAPI, baseUrl: string): string[];
export declare function extractForms($: CheerioAPI): FormData[];
export declare function extractJsonLd($: CheerioAPI): Record<string, unknown>[];
//# sourceMappingURL=extract.d.ts.map