"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
exports.getMeta = getMeta;
exports.getAllMeta = getAllMeta;
exports.getOG = getOG;
exports.getText = getText;
exports.getLines = getLines;
exports.matchText = matchText;
exports.stripHTML = stripHTML;
exports.parseNumber = parseNumber;
const cheerio_1 = __importDefault(require("cheerio"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const chardet_1 = __importDefault(require("chardet"));
function load(html, opts = {}) {
    let buffer = html;
    if (opts.encoding && opts.encoding !== 'utf8') {
        buffer = iconv_lite_1.default.decode(Buffer.from(html, 'binary'), opts.encoding);
    }
    if (opts.autoDetect) {
        const detected = chardet_1.default.detect(Buffer.from(html));
        if (detected && detected.toLowerCase() !== 'utf-8') {
            buffer = iconv_lite_1.default.decode(Buffer.from(html, 'binary'), detected);
        }
    }
    return cheerio_1.default.load(buffer);
}
function getMeta($, prop) {
    return $(`meta[property="${prop}"], meta[name="${prop}"]`).attr('content') || '';
}
function getAllMeta($) {
    const tags = {};
    $('meta').each((_, el) => {
        const $el = $(el);
        const key = $el.attr('property') || $el.attr('name') || '';
        const value = $el.attr('content') || '';
        if (key && value)
            tags[key] = value;
    });
    return tags;
}
function getOG($) {
    const og = {};
    $('meta[property^="og:"]').each((_, el) => {
        const $el = $(el);
        const prop = $el.attr('property') || '';
        og[prop.replace('og:', '')] = $el.attr('content') || '';
    });
    return og;
}
function getText($) {
    return $('body').text().replace(/\s+/g, ' ').trim();
}
function getLines($) {
    return getText($).split('\n').map(l => l.trim()).filter(Boolean);
}
function matchText(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return {
                match: match[0],
                capture: match[1]?.trim() || null,
            };
        }
    }
    return null;
}
function stripHTML(html) {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function parseNumber(str) {
    if (!str)
        return null;
    const match = str.match(/^([\d\s.,]+)\s*(mil|k|m|b)?$/i);
    if (!match)
        return null;
    let value = parseFloat(match[1]
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.'));
    if (isNaN(value))
        return null;
    const suffix = match[2]?.toLowerCase();
    if (suffix === 'k' || suffix === 'mil')
        value *= 1e3;
    else if (suffix === 'm')
        value *= 1e6;
    else if (suffix === 'b')
        value *= 1e9;
    return Math.round(value).toString();
}
//# sourceMappingURL=parser.js.map