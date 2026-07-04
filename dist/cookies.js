"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookiesFromFile = cookiesFromFile;
exports.cookiesFromNetscape = cookiesFromNetscape;
exports.cookiesFromBrowser = cookiesFromBrowser;
exports.cookiesToHeader = cookiesToHeader;
exports.mergeCookies = mergeCookies;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function cookiesFromFile(filePath) {
    try {
        return node_fs_1.default.readFileSync(node_path_1.default.resolve(filePath), 'utf8').trim();
    }
    catch {
        return '';
    }
}
function cookiesFromNetscape(filePath) {
    try {
        const content = node_fs_1.default.readFileSync(node_path_1.default.resolve(filePath), 'utf8');
        const cookies = [];
        for (const line of content.split('\n')) {
            if (line.startsWith('#') || !line.trim())
                continue;
            const parts = line.trim().split('\t');
            if (parts.length >= 7) {
                cookies.push(`${parts[5]}=${parts[6]}`);
            }
        }
        return cookies.join('; ');
    }
    catch {
        return '';
    }
}
function cookiesFromBrowser(filePath) {
    return cookiesFromNetscape(filePath);
}
function cookiesToHeader(cookies) {
    if (Array.isArray(cookies))
        return cookies.join('; ');
    return cookies;
}
function mergeCookies(...cookies) {
    const map = {};
    for (const c of cookies) {
        if (!c)
            continue;
        c.split(';').forEach(pair => {
            const [k, ...v] = pair.trim().split('=');
            if (k)
                map[k.trim()] = v.join('=');
        });
    }
    return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}
//# sourceMappingURL=cookies.js.map