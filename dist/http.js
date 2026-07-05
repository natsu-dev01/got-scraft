"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = fetch;
exports.fetchRaw = fetchRaw;
exports.fetchWithRetry = fetchWithRetry;
exports.post = post;
exports.put = put;
exports.patch = patch;
exports.del = del;
exports.head = head;
exports.fetchStream = fetchStream;
exports.downloadFile = downloadFile;
exports.applyDelay = applyDelay;
exports.applyThrottle = applyThrottle;
const client_1 = require("./client");
const anti_1 = require("./anti");
const utils_1 = require("./utils");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const DEFAULT_RETRY_STATUSES = [429, 503, 502, 500];
function applyDelay(opts) {
    if (opts.delay) {
        return (0, utils_1.randomDelay)(opts.delayMin || 500, opts.delayMax || 2000);
    }
    return Promise.resolve();
}
function applyThrottle(opts) {
    if (opts.throttler) {
        return opts.throttler.wait();
    }
    return Promise.resolve();
}
function buildRequestConfig(opts) {
    const config = {
        responseType: opts.responseType || 'text',
    };
    if (opts.headers)
        config.headers = opts.headers;
    if (opts.timeout)
        config.timeout = opts.timeout;
    if (opts.params)
        config.params = opts.params;
    if (opts.responseEncoding)
        config.responseEncoding = opts.responseEncoding;
    if (opts.signal)
        config.signal = opts.signal;
    return config;
}
async function fetch(url, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyDelay(opts);
    await applyThrottle(opts);
    const { data } = await client.get(finalUrl, buildRequestConfig(opts));
    return data;
}
async function fetchRaw(url, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyDelay(opts);
    await applyThrottle(opts);
    return client.get(finalUrl, buildRequestConfig(opts));
}
async function fetchWithRetry(url, opts = {}) {
    const maxRetries = opts.retries || 3;
    const retryStatuses = opts.retryOnStatus || DEFAULT_RETRY_STATUSES;
    const client = opts.client || (0, client_1.createClient)({ ...opts, cookieJar: false });
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
            if (opts.throttler) {
                await opts.throttler.wait();
            }
            if (opts.delay && attempt > 0) {
                await (0, utils_1.randomDelay)(opts.delayMin || 1000, opts.delayMax || 3000);
            }
            const config = buildRequestConfig(opts);
            const response = await client.get(finalUrl, config);
            if (retryStatuses.includes(response.status) && attempt < maxRetries - 1) {
                const waitTime = calcBackoff(attempt, opts.retryDelay, opts.maxRetryDelay);
                await (0, utils_1.sleep)(waitTime);
                continue;
            }
            return response.data;
        }
        catch (error) {
            if (attempt === maxRetries - 1) {
                throw error;
            }
            if (error.response && retryStatuses.includes(error.response.status)) {
                const waitTime = calcBackoff(attempt, opts.retryDelay, opts.maxRetryDelay);
                await (0, utils_1.sleep)(waitTime);
                continue;
            }
            if (opts.proxyRotator && opts.rotateOnError !== false) {
                rotateClientProxy(client, opts.proxyRotator);
            }
            const waitTime = calcBackoff(attempt, opts.retryDelay, opts.maxRetryDelay);
            await (0, utils_1.sleep)(waitTime);
        }
    }
    throw new Error('fetchWithRetry: all retries failed');
}
function calcBackoff(attempt, baseDelay, maxDelay) {
    const base = baseDelay || 1000;
    const max = maxDelay || 30000;
    return Math.min(base * Math.pow(2, attempt) + (0, utils_1.rand)(0, 2000), max);
}
function rotateClientProxy(client, rotator) {
    const nextProxy = rotator.next();
    if (!nextProxy)
        return;
    const parsed = rotator.parse(nextProxy);
    if (typeof parsed === 'string') {
        client.defaults.httpsAgent = rotator.getAgent(nextProxy);
        delete client.defaults.proxy;
    }
    else {
        client.defaults.proxy = parsed;
        delete client.defaults.httpsAgent;
    }
}
async function post(url, body, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyDelay(opts);
    await applyThrottle(opts);
    const contentType = opts.contentType || opts.headers?.['Content-Type'] || autoDetectContentType(body);
    const config = buildRequestConfig(opts);
    config.headers = {
        'Content-Type': contentType,
        ...opts.headers,
    };
    const { data } = await client.post(finalUrl, body, config);
    return data;
}
function autoDetectContentType(body) {
    if (typeof body === 'string') {
        try {
            JSON.parse(body);
            return 'application/json';
        }
        catch {
            return 'application/x-www-form-urlencoded';
        }
    }
    if (body instanceof FormData || body instanceof URLSearchParams) {
        return 'multipart/form-data';
    }
    if (body && typeof body === 'object') {
        return 'application/json';
    }
    return 'application/x-www-form-urlencoded';
}
async function put(url, body, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyDelay(opts);
    await applyThrottle(opts);
    const contentType = opts.contentType || opts.headers?.['Content-Type'] || autoDetectContentType(body);
    const config = buildRequestConfig(opts);
    config.headers = {
        'Content-Type': contentType,
        ...opts.headers,
    };
    const { data } = await client.put(finalUrl, body, config);
    return data;
}
async function patch(url, body, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyDelay(opts);
    await applyThrottle(opts);
    const contentType = opts.contentType || opts.headers?.['Content-Type'] || autoDetectContentType(body);
    const config = buildRequestConfig(opts);
    config.headers = {
        'Content-Type': contentType,
        ...opts.headers,
    };
    const { data } = await client.patch(finalUrl, body, config);
    return data;
}
async function del(url, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyDelay(opts);
    await applyThrottle(opts);
    const { data } = await client.delete(finalUrl, buildRequestConfig(opts));
    return data;
}
async function head(url, opts = {}) {
    const client = opts.client || (0, client_1.createClient)({ ...opts, cookieJar: false });
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyThrottle(opts);
    return client.head(finalUrl, {
        headers: opts.headers,
        timeout: opts.timeout,
    });
}
async function fetchStream(url, opts = {}) {
    const client = opts.client || (0, client_1.createClient)({ ...opts, cookieJar: false });
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    await applyDelay(opts);
    await applyThrottle(opts);
    const response = await client.get(finalUrl, {
        ...buildRequestConfig(opts),
        responseType: 'stream',
    });
    return response.data;
}
async function downloadFile(url, destPath, opts = {}) {
    const resolved = path.resolve(destPath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const response = await fetchRaw(url, { ...opts, responseType: 'stream' });
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(resolved);
        const total = parseInt(String(response.headers['content-length'] ?? '0'), 10);
        let downloaded = 0;
        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            if (opts.onProgress) {
                opts.onProgress(downloaded, total);
            }
        });
        response.data.pipe(file);
        file.on('finish', () => {
            file.close();
            resolve(resolved);
        });
        file.on('error', (err) => {
            file.close();
            if (fs.existsSync(resolved))
                fs.unlinkSync(resolved);
            reject(err);
        });
    });
}
//# sourceMappingURL=http.js.map