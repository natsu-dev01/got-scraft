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
const cheerio = __importStar(require("cheerio"));
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
    return cheerio.load(buffer);
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