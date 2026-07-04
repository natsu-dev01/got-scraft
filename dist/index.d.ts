import pkg from '../package.json';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { fetch, fetchWithRetry, post } from './http';
import type { FetchOptions, RetryOptions } from './http';
import { createClient, createSession } from './client';
import type { ClientOptions, Session } from './client';
import { load, getMeta, getAllMeta, getOG, getText, getLines, matchText, stripHTML, parseNumber } from './parser';
import type { LoadOptions, MatchResult } from './parser';
import { extractLinks, extractImages, extractScripts, extractStyles, extractEmails, extractIFrames, extractForms, extractJsonLd } from './extract';
import type { FormData } from './extract';
import { buildHeaders, buildSecChUa, PROFILES, AGENTS, REFERERS, LANGUAGES } from './headers';
import type { BuildHeadersOptions, DeviceProfile } from './headers';
import { ProxyRotator, Throttler, cacheBust, isBlocked, inspectResponse } from './anti';
import type { InspectResult } from './anti';
import { cookiesFromFile, cookiesFromNetscape, cookiesFromBrowser, cookiesToHeader, mergeCookies } from './cookies';
import { rand, pick, shuffle, shuffleObjectKeys, sleep, randomDelay, saveJSON, loadJSON, log } from './utils';
import { buildFbHeaders, toMobileUrl, toGraphApiUrl, parseMbasicContent, extractFacebookVideo, extractFacebookPostId, extractPageName } from './facebook';
import type { FbContent } from './facebook';
declare const INTEGRITY: Record<string, string>;
export interface MetaResult {
    url: string;
    title: string;
    meta: Record<string, string>;
    og: Record<string, string>;
}
export declare function scrapeMeta(url: string, opts?: FetchOptions): Promise<MetaResult>;
export interface FbResult {
    success: boolean;
    source: string;
    content: FbContent | Record<string, unknown> | null;
    error?: string;
}
export declare function scrapeFacebook(url: string, opts?: ClientOptions & {
    tryGraphApi?: boolean;
}): Promise<FbResult>;
export interface VerifyResult {
    ok: boolean;
    version: string;
    hash?: string;
    expected?: string;
    error?: string;
}
export declare function verify(): VerifyResult;
export declare const version: string;
export { pkg as packageInfo, INTEGRITY as integrityMap, fetch, fetchWithRetry, post, createClient, createSession, load, getMeta, getAllMeta, getOG, getText, getLines, matchText, stripHTML, parseNumber, extractLinks, extractImages, extractScripts, extractStyles, extractEmails, extractIFrames, extractForms, extractJsonLd, ProxyRotator, Throttler, cacheBust, isBlocked, inspectResponse, buildHeaders, buildSecChUa, PROFILES, AGENTS, REFERERS, LANGUAGES, cookiesFromFile, cookiesFromNetscape, cookiesFromBrowser, cookiesToHeader, mergeCookies, rand, pick, shuffle, shuffleObjectKeys, sleep, randomDelay, saveJSON, loadJSON, log, buildFbHeaders, toMobileUrl, toGraphApiUrl, parseMbasicContent, extractFacebookVideo, extractFacebookPostId, extractPageName, };
export type { AxiosInstance, AxiosRequestConfig, FetchOptions, RetryOptions, ClientOptions, Session, LoadOptions, MatchResult, FormData, BuildHeadersOptions, DeviceProfile, InspectResult, FbContent, };
//# sourceMappingURL=index.d.ts.map