"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.loadJSON = exports.saveJSON = exports.randomDelay = exports.sleep = exports.shuffleObjectKeys = exports.shuffle = exports.pick = exports.rand = exports.mergeCookies = exports.cookiesToHeader = exports.cookiesFromBrowser = exports.cookiesFromNetscape = exports.cookiesFromFile = exports.LANGUAGES = exports.REFERERS = exports.AGENTS = exports.PROFILES = exports.buildSecChUa = exports.buildHeaders = exports.inspectResponse = exports.isBlocked = exports.cacheBust = exports.Throttler = exports.ProxyRotator = exports.extractJsonLd = exports.extractForms = exports.extractIFrames = exports.extractEmails = exports.extractStyles = exports.extractScripts = exports.extractImages = exports.extractLinks = exports.parseNumber = exports.stripHTML = exports.matchText = exports.getLines = exports.getText = exports.getOG = exports.getAllMeta = exports.getMeta = exports.load = exports.createSession = exports.createClient = exports.post = exports.fetchWithRetry = exports.fetch = exports.integrityMap = exports.packageInfo = exports.version = void 0;
exports.extractPageName = exports.extractFacebookPostId = exports.extractFacebookVideo = exports.parseMbasicContent = exports.toGraphApiUrl = exports.toMobileUrl = exports.buildFbHeaders = void 0;
exports.scrapeMeta = scrapeMeta;
exports.scrapeFacebook = scrapeFacebook;
exports.verify = verify;
const node_crypto_1 = __importDefault(require("node:crypto"));
const package_json_1 = __importDefault(require("../package.json"));
exports.packageInfo = package_json_1.default;
const http_1 = require("./http");
Object.defineProperty(exports, "fetch", { enumerable: true, get: function () { return http_1.fetch; } });
Object.defineProperty(exports, "fetchWithRetry", { enumerable: true, get: function () { return http_1.fetchWithRetry; } });
Object.defineProperty(exports, "post", { enumerable: true, get: function () { return http_1.post; } });
const client_1 = require("./client");
Object.defineProperty(exports, "createClient", { enumerable: true, get: function () { return client_1.createClient; } });
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return client_1.createSession; } });
const parser_1 = require("./parser");
Object.defineProperty(exports, "load", { enumerable: true, get: function () { return parser_1.load; } });
Object.defineProperty(exports, "getMeta", { enumerable: true, get: function () { return parser_1.getMeta; } });
Object.defineProperty(exports, "getAllMeta", { enumerable: true, get: function () { return parser_1.getAllMeta; } });
Object.defineProperty(exports, "getOG", { enumerable: true, get: function () { return parser_1.getOG; } });
Object.defineProperty(exports, "getText", { enumerable: true, get: function () { return parser_1.getText; } });
Object.defineProperty(exports, "getLines", { enumerable: true, get: function () { return parser_1.getLines; } });
Object.defineProperty(exports, "matchText", { enumerable: true, get: function () { return parser_1.matchText; } });
Object.defineProperty(exports, "stripHTML", { enumerable: true, get: function () { return parser_1.stripHTML; } });
Object.defineProperty(exports, "parseNumber", { enumerable: true, get: function () { return parser_1.parseNumber; } });
const extract_1 = require("./extract");
Object.defineProperty(exports, "extractLinks", { enumerable: true, get: function () { return extract_1.extractLinks; } });
Object.defineProperty(exports, "extractImages", { enumerable: true, get: function () { return extract_1.extractImages; } });
Object.defineProperty(exports, "extractScripts", { enumerable: true, get: function () { return extract_1.extractScripts; } });
Object.defineProperty(exports, "extractStyles", { enumerable: true, get: function () { return extract_1.extractStyles; } });
Object.defineProperty(exports, "extractEmails", { enumerable: true, get: function () { return extract_1.extractEmails; } });
Object.defineProperty(exports, "extractIFrames", { enumerable: true, get: function () { return extract_1.extractIFrames; } });
Object.defineProperty(exports, "extractForms", { enumerable: true, get: function () { return extract_1.extractForms; } });
Object.defineProperty(exports, "extractJsonLd", { enumerable: true, get: function () { return extract_1.extractJsonLd; } });
const headers_1 = require("./headers");
Object.defineProperty(exports, "buildHeaders", { enumerable: true, get: function () { return headers_1.buildHeaders; } });
Object.defineProperty(exports, "buildSecChUa", { enumerable: true, get: function () { return headers_1.buildSecChUa; } });
Object.defineProperty(exports, "PROFILES", { enumerable: true, get: function () { return headers_1.PROFILES; } });
Object.defineProperty(exports, "AGENTS", { enumerable: true, get: function () { return headers_1.AGENTS; } });
Object.defineProperty(exports, "REFERERS", { enumerable: true, get: function () { return headers_1.REFERERS; } });
Object.defineProperty(exports, "LANGUAGES", { enumerable: true, get: function () { return headers_1.LANGUAGES; } });
const anti_1 = require("./anti");
Object.defineProperty(exports, "ProxyRotator", { enumerable: true, get: function () { return anti_1.ProxyRotator; } });
Object.defineProperty(exports, "Throttler", { enumerable: true, get: function () { return anti_1.Throttler; } });
Object.defineProperty(exports, "cacheBust", { enumerable: true, get: function () { return anti_1.cacheBust; } });
Object.defineProperty(exports, "isBlocked", { enumerable: true, get: function () { return anti_1.isBlocked; } });
Object.defineProperty(exports, "inspectResponse", { enumerable: true, get: function () { return anti_1.inspectResponse; } });
const cookies_1 = require("./cookies");
Object.defineProperty(exports, "cookiesFromFile", { enumerable: true, get: function () { return cookies_1.cookiesFromFile; } });
Object.defineProperty(exports, "cookiesFromNetscape", { enumerable: true, get: function () { return cookies_1.cookiesFromNetscape; } });
Object.defineProperty(exports, "cookiesFromBrowser", { enumerable: true, get: function () { return cookies_1.cookiesFromBrowser; } });
Object.defineProperty(exports, "cookiesToHeader", { enumerable: true, get: function () { return cookies_1.cookiesToHeader; } });
Object.defineProperty(exports, "mergeCookies", { enumerable: true, get: function () { return cookies_1.mergeCookies; } });
const utils_1 = require("./utils");
Object.defineProperty(exports, "rand", { enumerable: true, get: function () { return utils_1.rand; } });
Object.defineProperty(exports, "pick", { enumerable: true, get: function () { return utils_1.pick; } });
Object.defineProperty(exports, "shuffle", { enumerable: true, get: function () { return utils_1.shuffle; } });
Object.defineProperty(exports, "shuffleObjectKeys", { enumerable: true, get: function () { return utils_1.shuffleObjectKeys; } });
Object.defineProperty(exports, "sleep", { enumerable: true, get: function () { return utils_1.sleep; } });
Object.defineProperty(exports, "randomDelay", { enumerable: true, get: function () { return utils_1.randomDelay; } });
Object.defineProperty(exports, "saveJSON", { enumerable: true, get: function () { return utils_1.saveJSON; } });
Object.defineProperty(exports, "loadJSON", { enumerable: true, get: function () { return utils_1.loadJSON; } });
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return utils_1.log; } });
const facebook_1 = require("./facebook");
Object.defineProperty(exports, "buildFbHeaders", { enumerable: true, get: function () { return facebook_1.buildFbHeaders; } });
Object.defineProperty(exports, "toMobileUrl", { enumerable: true, get: function () { return facebook_1.toMobileUrl; } });
Object.defineProperty(exports, "toGraphApiUrl", { enumerable: true, get: function () { return facebook_1.toGraphApiUrl; } });
Object.defineProperty(exports, "parseMbasicContent", { enumerable: true, get: function () { return facebook_1.parseMbasicContent; } });
Object.defineProperty(exports, "extractFacebookVideo", { enumerable: true, get: function () { return facebook_1.extractFacebookVideo; } });
Object.defineProperty(exports, "extractFacebookPostId", { enumerable: true, get: function () { return facebook_1.extractFacebookPostId; } });
Object.defineProperty(exports, "extractPageName", { enumerable: true, get: function () { return facebook_1.extractPageName; } });
const INTEGRITY = {
    '2.0.0': '515c8e83f6020ea5e23abe7e9bcdef0bd3565cd81d43f6d48cce7d1dc48ff79a',
    '2.1.0': '7d58bff27aa800a01a92bd50bc5c421f00fc67ebe911472f53bf37a12347a967',
};
exports.integrityMap = INTEGRITY;
async function scrapeMeta(url, opts = {}) {
    const html = await (0, http_1.fetch)(url, { ...opts, cookieJar: false });
    const $ = (0, parser_1.load)(html);
    return {
        url,
        meta: (0, parser_1.getAllMeta)($),
        title: $('title').text().trim(),
        og: (0, parser_1.getOG)($),
    };
}
async function scrapeFacebook(url, opts = {}) {
    const client = (0, client_1.createClient)({
        headers: (0, facebook_1.buildFbHeaders)('mobile'),
        timeout: 15000,
        cookieJar: true,
    });
    const strategies = [];
    strategies.push({
        name: 'mbasic',
        url: (0, facebook_1.toMobileUrl)(url),
        headers: (0, facebook_1.buildFbHeaders)('mobile'),
    });
    if (opts.tryGraphApi) {
        const graphUrl = (0, facebook_1.toGraphApiUrl)(url);
        if (graphUrl) {
            strategies.push({
                name: 'graph',
                url: graphUrl,
                headers: (0, facebook_1.buildFbHeaders)('graph'),
            });
        }
    }
    strategies.push({
        name: 'desktop',
        url: url,
        headers: (0, facebook_1.buildFbHeaders)('desktop'),
    });
    for (const strategy of strategies) {
        try {
            const { data } = await client.get(strategy.url, {
                headers: strategy.headers,
                responseType: 'text',
            });
            if (strategy.name === 'graph') {
                return {
                    success: true,
                    source: 'graph',
                    content: typeof data === 'string' ? JSON.parse(data) : data,
                };
            }
            const parsed = (0, facebook_1.parseMbasicContent)(data);
            if (parsed.error === 'blocked') {
                continue;
            }
            return {
                success: true,
                source: strategy.name,
                content: parsed,
            };
        }
        catch {
            continue;
        }
    }
    return {
        success: false,
        source: 'none',
        content: null,
        error: 'All Facebook strategies failed (blocked or unreachable)',
    };
}
function verify() {
    const fs = require('node:fs');
    const path = require('node:path');
    const integrityFile = path.join(__dirname, '.integrity');
    let expected = null;
    try {
        expected = fs.readFileSync(integrityFile, 'utf-8').trim();
    }
    catch {
        // Fallback to hardcoded INTEGRITY map
        expected = INTEGRITY[package_json_1.default.version] || null;
    }
    if (!expected) {
        return { ok: false, version: package_json_1.default.version, error: 'No integrity hash for this version' };
    }
    const mainFile = path.join(__dirname, 'index.js');
    const content = fs.readFileSync(mainFile);
    const hash = node_crypto_1.default.createHash('sha256').update(content).digest('hex');
    return { ok: hash === expected, version: package_json_1.default.version, hash, expected };
}
exports.version = package_json_1.default.version;
//# sourceMappingURL=index.js.map