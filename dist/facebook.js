"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FB_COOKIE_BASE = exports.FB_GRAPH_HEADERS = exports.FB_DESKTOP_HEADERS = exports.FB_MOBILE_HEADERS = void 0;
exports.extractFacebookVideo = extractFacebookVideo;
exports.extractFacebookPostId = extractFacebookPostId;
exports.extractPageName = extractPageName;
exports.toMobileUrl = toMobileUrl;
exports.toGraphApiUrl = toGraphApiUrl;
exports.buildFbHeaders = buildFbHeaders;
exports.parseMbasicContent = parseMbasicContent;
exports.FB_MOBILE_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?1',
    'Sec-Ch-Ua-Platform': '"Android"',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'Connection': 'keep-alive',
};
exports.FB_DESKTOP_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'Connection': 'keep-alive',
};
exports.FB_GRAPH_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    'Origin': 'https://developers.facebook.com',
    'Referer': 'https://developers.facebook.com/',
};
exports.FB_COOKIE_BASE = 'sb=abc123; datr=xyz789; reg_ext_ref=deleted; fr=0; presence=C%7B%22t3%22%3A%5B%5D%7D';
function extractFacebookVideo(url) {
    const patterns = [
        /facebook\.com\/[^/]+\/videos\/(\d+)/,
        /facebook\.com\/watch\/?\?v=(\d+)/,
        /fb\.watch\/([a-zA-Z0-9]+)/,
        /facebook\.com\/reel\/(\d+)/,
        /facebook\.com\/video\.php\?v=(\d+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m)
            return m[1];
    }
    return null;
}
function extractFacebookPostId(url) {
    const patterns = [
        /facebook\.com\/[^/]+\/posts\/(\d+)/,
        /facebook\.com\/[^/]+\/photos\/[^/]+\/(\d+)/,
        /facebook\.com\/story\.php\?story_fbid=(\d+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m)
            return m[1];
    }
    return null;
}
function extractPageName(url) {
    const m = url.match(/facebook\.com\/([^/?]+)/);
    return m ? m[1] : null;
}
function toMobileUrl(url) {
    return url.replace(/https?:\/\/(www\.|m\.|mbasic\.)?facebook\.com/, 'https://mbasic.facebook.com');
}
function toGraphApiUrl(url) {
    const pageName = extractPageName(url);
    if (!pageName)
        return null;
    const postId = extractFacebookPostId(url);
    if (postId)
        return `https://graph.facebook.com/v21.0/${pageName}_${postId}?access_token=&fields=message,created_time,permalink_url,attachments`;
    return `https://graph.facebook.com/v21.0/${pageName}?access_token=&fields=name,about,description,link`;
}
function buildFbHeaders(type = 'mobile', additional = {}) {
    const base = type === 'mobile'
        ? { ...exports.FB_MOBILE_HEADERS }
        : type === 'desktop'
            ? { ...exports.FB_DESKTOP_HEADERS }
            : { ...exports.FB_GRAPH_HEADERS };
    if (type !== 'graph') {
        base.Cookie = exports.FB_COOKIE_BASE;
    }
    return { ...base, ...additional };
}
function parseMbasicContent(html) {
    const result = { text: null, images: [], videos: [], links: [], error: null };
    if (!html) {
        result.error = 'Empty response';
        return result;
    }
    const clean = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    const textMatch = clean.match(/<div[^>]*id="(?:root|content)"[^>]*>[\s\S]*?<\/div>/i);
    if (textMatch) {
        result.text = textMatch[0]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/ver más|ver menos|responder|compartir/i, '')
            .trim();
    }
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(clean)) !== null) {
        const src = imgMatch[1];
        if (src && !src.includes('emoji') && !src.includes('transparent')) {
            result.images.push(src);
        }
    }
    const videoRegex = /<video[^>]+src="([^"]+)"[^>]*>|<a[^>]+href="([^"]*video[^"]*)"[^>]*>/gi;
    let vidMatch;
    while ((vidMatch = videoRegex.exec(clean)) !== null) {
        result.videos.push(vidMatch[1] || vidMatch[2] || '');
    }
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(clean)) !== null) {
        const href = linkMatch[1];
        if (href && !href.startsWith('#') && !href.startsWith('/login')) {
            result.links.push(href);
        }
    }
    const blocked = /login|checkpoint|captcha|bloqueado|blocked/i.test(clean);
    if (blocked)
        result.error = 'blocked';
    return result;
}
//# sourceMappingURL=facebook.js.map