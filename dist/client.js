"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.resolveUrl = resolveUrl;
exports.isValidUrl = isValidUrl;
exports.createSession = createSession;
const axios_1 = __importDefault(require("axios"));
const headers_1 = require("./headers");
const anti_1 = require("./anti");
const utils_1 = require("./utils");
const https_proxy_agent_1 = require("https-proxy-agent");
function createClient(opts = {}) {
    const config = {
        timeout: opts.timeout || 30000,
        headers: (0, headers_1.buildHeaders)(opts),
        decompress: true,
        maxRedirects: opts.maxRedirects || 5,
        validateStatus: opts.validateStatus || (status => status < 500),
    };
    if (opts.proxy) {
        if (typeof opts.proxy === 'string') {
            const rotator = new anti_1.ProxyRotator();
            const parsed = rotator.parse(opts.proxy);
            if (typeof parsed === 'string') {
                config.httpsAgent = new https_proxy_agent_1.HttpsProxyAgent(parsed);
            }
            else {
                config.proxy = parsed;
            }
        }
        else {
            config.proxy = opts.proxy;
        }
    }
    if (opts.httpsAgent)
        config.httpsAgent = opts.httpsAgent;
    if (opts.httpAgent)
        config.httpAgent = opts.httpAgent;
    if (opts.cookieJar !== false) {
        try {
            const tough = require('tough-cookie');
            config.jar = new tough.CookieJar();
            config.withCredentials = true;
        }
        catch {
            // tough-cookie no instalado
        }
    }
    if (opts.cookieFile) {
        try {
            const { cookiesFromFile } = require('./cookies');
            const cookie = cookiesFromFile(opts.cookieFile);
            if (cookie && config.headers) {
                config.headers.Cookie = cookie;
            }
        }
        catch {
            // Error al leer cookies
        }
    }
    const client = axios_1.default.create(config);
    if (opts.cookieJar !== false) {
        try {
            require('axios-cookiejar-support')(client);
        }
        catch {
            // axios-cookiejar-support no instalado
        }
    }
    if (opts.requestInterceptor) {
        client.interceptors.request.use(opts.requestInterceptor);
    }
    if (opts.responseInterceptor) {
        client.interceptors.response.use(opts.responseInterceptor);
    }
    if (opts.errorInterceptor) {
        client.interceptors.response.use(undefined, opts.errorInterceptor);
    }
    return client;
}
const PLATFORM_PREFIXES = {
    '.fb': 'facebook',
    '.facebook': 'facebook',
    '.tw': 'twitter',
    '.x': 'twitter',
    '.tiktok': 'tiktok',
    '.ig': 'instagram',
    '.instagram': 'instagram',
};
function resolveUrl(input) {
    const trimmed = input.trim();
    for (const [prefix, platform] of Object.entries(PLATFORM_PREFIXES)) {
        if (trimmed.startsWith(prefix + ' ')) {
            return { url: trimmed.slice(prefix.length + 1).trim(), platform };
        }
    }
    return { url: trimmed };
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
function createSession(opts = {}) {
    const client = createClient({ ...opts, cookieJar: opts.cookieJar !== false });
    const throttler = opts.throttler || new anti_1.Throttler(opts.maxRPM || 30);
    const rotator = opts.proxyRotator || null;
    let lastRequest = 0;
    return {
        client,
        throttler,
        rotator,
        async get(url, reqOpts = {}) {
            const { url: cleanUrl } = resolveUrl(url);
            if (!isValidUrl(cleanUrl)) {
                throw new Error(`Invalid URL: "${cleanUrl}"`);
            }
            await throttler.wait();
            const now = Date.now();
            const minGap = reqOpts.minGap || opts.minGap || 2000;
            const elapsed = now - lastRequest;
            if (elapsed < minGap) {
                await (0, utils_1.sleep)(minGap - elapsed);
            }
            lastRequest = Date.now();
            const finalUrl = reqOpts.cacheBust !== false ? (0, anti_1.cacheBust)(cleanUrl) : cleanUrl;
            const { data } = await client.get(finalUrl, {
                responseType: (reqOpts.responseType || 'text'),
                headers: reqOpts.headers,
                params: reqOpts.params,
                timeout: reqOpts.timeout,
                signal: reqOpts.signal,
            });
            return data;
        },
        async post(url, body, reqOpts = {}) {
            const { url: cleanUrl } = resolveUrl(url);
            if (!isValidUrl(cleanUrl)) {
                throw new Error(`Invalid URL: "${cleanUrl}"`);
            }
            await throttler.wait();
            const now = Date.now();
            const minGap = reqOpts.minGap || opts.minGap || 2000;
            const elapsed = now - lastRequest;
            if (elapsed < minGap) {
                await (0, utils_1.sleep)(minGap - elapsed);
            }
            lastRequest = Date.now();
            const { data } = await client.post(cleanUrl, body, {
                headers: {
                    'Content-Type': reqOpts.contentType || 'application/x-www-form-urlencoded',
                    ...reqOpts.headers,
                },
                responseType: (reqOpts.responseType || 'text'),
                params: reqOpts.params,
                timeout: reqOpts.timeout,
                signal: reqOpts.signal,
            });
            return data;
        },
        async head(url, reqOpts = {}) {
            const { url: cleanUrl } = resolveUrl(url);
            if (!isValidUrl(cleanUrl)) {
                throw new Error(`Invalid URL: "${cleanUrl}"`);
            }
            await throttler.wait();
            const now = Date.now();
            const minGap = reqOpts.minGap || opts.minGap || 2000;
            const elapsed = now - lastRequest;
            if (elapsed < minGap) {
                await (0, utils_1.sleep)(minGap - elapsed);
            }
            lastRequest = Date.now();
            return client.head(cleanUrl, {
                headers: reqOpts.headers,
                timeout: reqOpts.timeout,
                signal: reqOpts.signal,
            });
        },
        async request(config) {
            const { url: cleanUrl } = resolveUrl(config.url);
            if (!isValidUrl(cleanUrl)) {
                throw new Error(`Invalid URL: "${cleanUrl}"`);
            }
            await throttler.wait();
            const now = Date.now();
            const minGap = opts.minGap || 2000;
            const elapsed = now - lastRequest;
            if (elapsed < minGap) {
                await (0, utils_1.sleep)(minGap - elapsed);
            }
            lastRequest = Date.now();
            return client.request({ ...config, url: cleanUrl });
        },
        rotateProxy() {
            if (!this.rotator)
                return;
            const next = this.rotator.next();
            if (!next)
                return;
            const parsed = this.rotator.parse(next);
            if (typeof parsed === 'string') {
                client.defaults.httpsAgent = this.rotator.getAgent(next);
                delete client.defaults.proxy;
            }
            else {
                client.defaults.proxy = parsed;
                delete client.defaults.httpsAgent;
            }
        },
    };
}
//# sourceMappingURL=client.js.map