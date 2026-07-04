"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = fetch;
exports.fetchWithRetry = fetchWithRetry;
exports.post = post;
const client_1 = require("./client");
const anti_1 = require("./anti");
const utils_1 = require("./utils");
async function fetch(url, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    if (opts.delay) {
        await (0, utils_1.randomDelay)(opts.delayMin || 500, opts.delayMax || 2000);
    }
    if (opts.throttler) {
        await opts.throttler.wait();
    }
    const { data } = await client.get(finalUrl, {
        responseType: opts.responseType || 'text',
    });
    return data;
}
async function fetchWithRetry(url, opts = {}) {
    const maxRetries = opts.retries || 3;
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
            const { data } = await client.get(finalUrl, {
                responseType: opts.responseType || 'text',
            });
            return data;
        }
        catch (error) {
            if (attempt === maxRetries - 1) {
                throw error;
            }
            if (opts.proxyRotator && opts.rotateOnError !== false) {
                const nextProxy = opts.proxyRotator.next();
                if (nextProxy) {
                    const parsed = opts.proxyRotator.parse(nextProxy);
                    if (typeof parsed === 'string') {
                        client.defaults.httpsAgent = opts.proxyRotator.getAgent(nextProxy);
                        delete client.defaults.proxy;
                    }
                    else {
                        client.defaults.proxy = parsed;
                        delete client.defaults.httpsAgent;
                    }
                }
            }
            const waitTime = Math.min(1000 * Math.pow(2, attempt) + (0, utils_1.rand)(0, 2000), 30000);
            await (0, utils_1.sleep)(waitTime);
        }
    }
    throw new Error('fetchWithRetry: all retries failed');
}
async function post(url, body, opts = {}) {
    const client = opts.client || (0, client_1.createClient)(opts);
    const finalUrl = opts.cacheBust ? (0, anti_1.cacheBust)(url) : url;
    if (opts.throttler) {
        await opts.throttler.wait();
    }
    const { data } = await client.post(finalUrl, body, {
        headers: {
            'Content-Type': opts.headers?.['Content-Type'] || 'application/x-www-form-urlencoded',
        },
        responseType: opts.responseType || 'text',
    });
    return data;
}
//# sourceMappingURL=http.js.map