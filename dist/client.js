"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
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
    return client;
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
            await throttler.wait();
            const now = Date.now();
            const minGap = reqOpts.minGap || opts.minGap || 2000;
            const elapsed = now - lastRequest;
            if (elapsed < minGap) {
                await (0, utils_1.sleep)(minGap - elapsed);
            }
            lastRequest = Date.now();
            const finalUrl = reqOpts.cacheBust !== false ? (0, anti_1.cacheBust)(url) : url;
            const { data } = await client.get(finalUrl, {
                responseType: (reqOpts.responseType || 'text'),
            });
            return data;
        },
        async post(url, body, reqOpts = {}) {
            await throttler.wait();
            const now = Date.now();
            const minGap = reqOpts.minGap || opts.minGap || 2000;
            const elapsed = now - lastRequest;
            if (elapsed < minGap) {
                await (0, utils_1.sleep)(minGap - elapsed);
            }
            lastRequest = Date.now();
            const { data } = await client.post(url, body, {
                headers: { 'Content-Type': reqOpts.contentType || 'application/x-www-form-urlencoded' },
                responseType: (reqOpts.responseType || 'text'),
            });
            return data;
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