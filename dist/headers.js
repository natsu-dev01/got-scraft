"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGES = exports.REFERERS = exports.AGENTS = exports.PROFILES = void 0;
exports.buildSecChUa = buildSecChUa;
exports.buildHeaders = buildHeaders;
const utils_1 = require("./utils");
exports.PROFILES = [
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', platform: '"Windows"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', platform: '"macOS"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36', platform: '"macOS"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: '"Linux"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0', platform: '"Windows"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0', platform: '"macOS"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0', platform: '"Windows"', mobile: '?0' },
    { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', platform: '"iOS"', mobile: '?1' },
    { ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36', platform: '"Android"', mobile: '?1' },
];
exports.AGENTS = exports.PROFILES.map(p => p.ua);
exports.REFERERS = [
    'https://www.google.com/', 'https://www.bing.com/', 'https://search.yahoo.com/',
    'https://www.facebook.com/', 'https://twitter.com/', 'https://www.instagram.com/',
    'https://www.youtube.com/', 'https://www.reddit.com/', 'https://t.co/',
    'https://l.facebook.com/', 'https://www.google.com/search?q=scraping',
    'https://duckduckgo.com/', 'https://www.linkedin.com/', 'https://www.pinterest.com/',
    'https://www.tumblr.com/', 'https://news.ycombinator.com/', 'https://stackoverflow.com/',
    'https://github.com/', 'https://medium.com/', 'https://www.wikipedia.org/',
    'https://www.quora.com/', 'https://discord.com/', 'https://telegram.org/',
];
exports.LANGUAGES = [
    'es-ES,es;q=0.9,en;q=0.8', 'es-MX,es;q=0.9,en;q=0.8',
    'en-US,en;q=0.9,es;q=0.8', 'en-GB,en;q=0.9,es;q=0.8',
    'es-AR,es;q=0.9,en;q=0.8', 'pt-BR,pt;q=0.9,en;q=0.8,es;q=0.5',
    'fr-FR,fr;q=0.9,en;q=0.8', 'de-DE,de;q=0.9,en;q=0.8',
    'it-IT,it;q=0.9,en;q=0.8', 'en-US,en;q=0.9',
    'ja-JP,ja;q=0.9,en;q=0.8', 'ko-KR,ko;q=0.9,en;q=0.8',
];
function buildSecChUa() {
    const v = (0, utils_1.rand)(120, 129);
    return `"Google Chrome";v="${v}", "Chromium";v="${v}", "Not.A/Brand";v="24"`;
}
function buildHeaders(opts = {}) {
    const profile = opts.profile || (0, utils_1.pick)(exports.PROFILES) || exports.PROFILES[0];
    const lang = opts.lang || (0, utils_1.pick)(exports.LANGUAGES) || 'en-US,en;q=0.9';
    const headers = {
        'User-Agent': opts.userAgent || profile.ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': lang,
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': opts.referer || (0, utils_1.pick)(exports.REFERERS) || 'https://www.google.com/',
        'Sec-Ch-Ua': buildSecChUa(),
        'Sec-Ch-Ua-Mobile': profile.mobile,
        'Sec-Ch-Ua-Platform': profile.platform,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': (0, utils_1.pick)(['same-origin', 'cross-site', 'none']) || 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': (0, utils_1.pick)(['max-age=0', 'no-cache', 'no-store']) || 'no-cache',
        'Pragma': 'no-cache',
        'DNT': (0, utils_1.pick)(['1', '0']) || '1',
        'Connection': 'keep-alive',
        'Priority': 'u=0, i',
        ...(opts.cacheBust ? { 'X-Request-Id': `${Date.now()}-${(0, utils_1.rand)(1000, 9999)}` } : {}),
        ...opts.headers,
    };
    if (opts.randomizeHeaders) {
        return (0, utils_1.shuffleObjectKeys)(headers);
    }
    return headers;
}
//# sourceMappingURL=headers.js.map