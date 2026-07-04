"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Throttler = exports.ProxyRotator = void 0;
exports.cacheBust = cacheBust;
exports.isBlocked = isBlocked;
exports.inspectResponse = inspectResponse;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const https_proxy_agent_1 = require("https-proxy-agent");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const utils_1 = require("./utils");
class ProxyRotator {
    _proxies = [];
    _index = 0;
    constructor(proxies = []) {
        this._proxies = proxies;
    }
    loadFromFile(filePath) {
        try {
            const content = node_fs_1.default.readFileSync(node_path_1.default.resolve(filePath), 'utf-8');
            this._proxies = content.split('\n').map(l => l.trim()).filter(Boolean);
        }
        catch {
            // Archivo no encontrado, ignorar
        }
        return this;
    }
    loadFromArray(arr) {
        this._proxies = [...arr];
        return this;
    }
    add(proxy) {
        this._proxies.push(proxy);
        return this;
    }
    next() {
        if (!this._proxies.length)
            return null;
        const proxy = this._proxies[this._index % this._proxies.length];
        this._index++;
        return proxy;
    }
    random() {
        if (!this._proxies.length)
            return null;
        return (0, utils_1.pick)(this._proxies);
    }
    parse(proxyStr) {
        if (proxyStr.startsWith('socks4://') || proxyStr.startsWith('socks5://') || proxyStr.startsWith('http://')) {
            return proxyStr;
        }
        const parts = proxyStr.split(':');
        return {
            host: parts[0],
            port: parseInt(parts[1] || '8080', 10),
            protocol: 'http',
        };
    }
    getAgent(proxyStr) {
        if (!proxyStr)
            return null;
        if (proxyStr.startsWith('socks4://') || proxyStr.startsWith('socks5://')) {
            return new socks_proxy_agent_1.SocksProxyAgent(proxyStr);
        }
        const fullUrl = proxyStr.startsWith('http') ? proxyStr : `http://${proxyStr}`;
        return new https_proxy_agent_1.HttpsProxyAgent(fullUrl);
    }
    nextAgent() {
        const proxy = this.next();
        return proxy ? this.getAgent(proxy) : null;
    }
    randomAgent() {
        const proxy = this.random();
        return proxy ? this.getAgent(proxy) : null;
    }
    get count() {
        return this._proxies.length;
    }
}
exports.ProxyRotator = ProxyRotator;
class Throttler {
    _maxRPM;
    _timestamps = [];
    constructor(maxRPM = 30) {
        this._maxRPM = maxRPM;
    }
    async wait() {
        const now = Date.now();
        this._timestamps = this._timestamps.filter(t => now - t < 60000);
        if (this._timestamps.length >= this._maxRPM) {
            const waitTime = this._timestamps[0] + 60000 - now;
            if (waitTime > 0) {
                await (0, utils_1.sleep)(waitTime + (0, utils_1.rand)(0, 2000));
            }
        }
        this._timestamps.push(Date.now());
    }
    set max(val) {
        this._maxRPM = val;
    }
    get max() {
        return this._maxRPM;
    }
}
exports.Throttler = Throttler;
function cacheBust(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}${(0, utils_1.rand)(100, 999)}`;
}
function isBlocked(html) {
    if (!html || typeof html !== 'string')
        return false;
    const signals = [
        'checkpoint', 'block', 'captcha', 'access denied', 'please wait',
        'automated requests', 'unusual traffic', 'verify you are human',
        'just a moment', 'cf-browser-verify', 'attention required',
        'you have been blocked', 'too many requests', '429',
        'your request has been blocked', 'sorry, you have been blocked',
        'our systems have detected unusual traffic', 'enter the code below',
        'security check', 'prove you\'re not a robot', 'js-challenge',
        'cf-challenge', 'ddos-guard', 'perimeterx', 'blocked because of malicious activity',
    ];
    const normalized = html.toLowerCase();
    return signals.some(signal => normalized.includes(signal));
}
function inspectResponse(response) {
    return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        blocked: [429, 403, 503].includes(response.status),
        redirected: response.request?.res?.responseUrl !== response.config?.url,
        finalUrl: response.request?.res?.responseUrl,
        size: String(response.data?.length || 0),
    };
}
//# sourceMappingURL=anti.js.map