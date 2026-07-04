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
exports.VIDEO_ITAGS = exports.AUDIO_ITAGS = void 0;
exports.getVideoInfo = getVideoInfo;
exports.getDirectUrl = getDirectUrl;
exports.getAudioUrl = getAudioUrl;
exports.getVideoUrl = getVideoUrl;
exports.download = download;
exports.extractYouTubeId = extractYouTubeId;
const client_1 = require("./client");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
const https = __importStar(require("node:https"));
const YT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
};
const AUDIO_ITAGS = {
    139: { mime: 'audio/mp4', bitrate: '48kbps', container: 'm4a' },
    140: { mime: 'audio/mp4', bitrate: '128kbps', container: 'm4a' },
    141: { mime: 'audio/mp4', bitrate: '256kbps', container: 'm4a' },
    249: { mime: 'audio/webm', bitrate: '50kbps', container: 'webm' },
    250: { mime: 'audio/webm', bitrate: '70kbps', container: 'webm' },
    251: { mime: 'audio/webm', bitrate: '160kbps', container: 'webm' },
};
exports.AUDIO_ITAGS = AUDIO_ITAGS;
const VIDEO_ITAGS = {
    18: { quality: '360p', container: 'mp4' },
    22: { quality: '720p', container: 'mp4' },
    137: { quality: '1080p', container: 'mp4' },
    136: { quality: '720p', container: 'mp4' },
    135: { quality: '480p', container: 'mp4' },
    134: { quality: '360p', container: 'mp4' },
    133: { quality: '240p', container: 'mp4' },
    160: { quality: '144p', container: 'mp4' },
    247: { quality: '720p', container: 'webm' },
    244: { quality: '480p', container: 'webm' },
    243: { quality: '360p', container: 'webm' },
    242: { quality: '240p', container: 'webm' },
    278: { quality: '144p', container: 'webm' },
};
exports.VIDEO_ITAGS = VIDEO_ITAGS;
function extractYouTubeId(url) {
    const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m)
            return m[1];
    }
    return null;
}
function parsePlayerResponse(raw) {
    try {
        const m = raw.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var|window|<\/)/);
        if (m)
            return JSON.parse(m[1]);
        const m2 = raw.match(/player_response["']\s*:\s*["']([^"']+)["']/);
        if (m2)
            return JSON.parse(Buffer.from(m2[1], 'base64').toString());
    }
    catch { /* ignore */ }
    return null;
}
function parseFormats(data) {
    const formats = [];
    const streaming = (data.streamingData || data);
    const rawFormats = (streaming.formats || data.formats || []);
    const rawAdaptive = (streaming.adaptiveFormats || data.adaptiveFormats || []);
    for (const f of [...rawFormats, ...rawAdaptive]) {
        const itag = Number(f.itag);
        let url = f.url || null;
        if (!url) {
            const cipher = (f.cipher || f.signatureCipher);
            if (cipher) {
                const params = new URLSearchParams(cipher);
                url = params.get('url');
                const sp = params.get('sp') || 'signature';
                const sig = params.get('s');
                if (url && sig)
                    url += `&${sp}=${sig}`;
            }
        }
        const mimeType = f.mimeType || '';
        const container = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : 'unknown';
        formats.push({
            itag,
            url,
            mimeType,
            container,
            quality: f.qualityLabel || f.quality,
            bitrate: AUDIO_ITAGS[itag]?.bitrate,
            contentLength: f.contentLength,
            approxDurationMs: f.approxDurationMs,
            audioChannels: f.audioChannels,
        });
    }
    return formats;
}
function extractThumbnail(data) {
    try {
        const details = data.videoDetails || {};
        const thumbs = details.thumbnail || {};
        const urls = thumbs.thumbnails || [];
        const best = urls.reduce((a, b) => {
            const aw = Number(a.width || 0);
            const bw = Number(b.width || 0);
            return bw > aw ? b : a;
        }, urls[0] || {});
        return best.url || `https://i.ytimg.com/vi/${details.videoId}/maxresdefault.jpg`;
    }
    catch {
        return '';
    }
}
function getYtDlpCacheDir() {
    const base = process.platform === 'win32'
        ? (process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'))
        : path.join(os.homedir(), '.cache');
    const dir = path.join(base, 'got-scraft', 'yt-dlp');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
function getYtDlpBinaryName() {
    if (process.platform === 'win32')
        return 'yt-dlp.exe';
    if (process.platform === 'darwin')
        return 'yt-dlp_macos';
    return 'yt-dlp';
}
function getYtDlpDownloadUrl() {
    return `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${getYtDlpBinaryName()}`;
}
function execYtDlp(binary, args) {
    return new Promise((resolve, reject) => {
        import('node:child_process').then(({ execFile }) => {
            execFile(binary, args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    const msg = stderr ? stderr.toString().split('\n').slice(0, 5).join('; ') : error.message;
                    reject(new Error(`yt-dlp: ${msg}`));
                }
                else {
                    resolve(stdout.toString());
                }
            });
        });
    });
}
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                file.close();
                fs.unlinkSync(destPath);
                downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                reject(new Error(`Download failed with status ${res.statusCode}`));
                return;
            }
            const total = parseInt(res.headers['content-length'] || '0', 10);
            let downloaded = 0;
            res.on('data', (chunk) => {
                downloaded += chunk.length;
                if (total > 0) {
                    const pct = ((downloaded / total) * 100).toFixed(1);
                    process.stderr.write(`\ryt-dlp: descargando ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB)`);
                }
            });
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                if (total > 0)
                    process.stderr.write('\n');
                resolve();
            });
            file.on('error', (err) => {
                file.close();
                fs.unlinkSync(destPath);
                reject(err);
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(destPath))
                fs.unlinkSync(destPath);
            reject(err);
        });
    });
}
async function downloadYtDlp(cacheDir) {
    const binaryName = getYtDlpBinaryName();
    const destPath = path.join(cacheDir, binaryName);
    const url = getYtDlpDownloadUrl();
    process.stderr.write(`yt-dlp: descargando ${binaryName} desde GitHub...\n`);
    await downloadFile(url, destPath);
    if (process.platform !== 'win32') {
        fs.chmodSync(destPath, 0o755);
    }
    const version = await execYtDlp(destPath, ['--version']).then(v => v.trim());
    process.stderr.write(`yt-dlp: descargado v${version} en ${destPath}\n`);
    return destPath;
}
async function findOrDownloadYtDlp(customPath) {
    if (customPath)
        return customPath;
    const cacheDir = getYtDlpCacheDir();
    const cachedBinary = path.join(cacheDir, getYtDlpBinaryName());
    if (fs.existsSync(cachedBinary)) {
        try {
            await execYtDlp(cachedBinary, ['--version']);
            return cachedBinary;
        }
        catch {
            fs.unlinkSync(cachedBinary);
        }
    }
    try {
        await execYtDlp(getYtDlpBinaryName(), ['--version']);
        return getYtDlpBinaryName();
    }
    catch {
        return downloadYtDlp(cacheDir);
    }
}
function ytDlpToYouTubeFormat(f) {
    const itag = parseInt(f.format_id, 10) || 0;
    const ext = f.ext || '';
    const vcodec = f.vcodec || '';
    const acodec = f.acodec || '';
    const mimeType = ext === 'mp4' ? `video/mp4; codecs="${vcodec || acodec || 'avc1'}"`
        : ext === 'webm' ? `video/webm; codecs="${vcodec || acodec || 'vp9'}"`
            : `${ext}/unknown`;
    const isAudio = vcodec === 'none' && acodec !== 'none';
    const isVideo = acodec === 'none' && vcodec !== 'none';
    const height = f.height || 0;
    const abr = f.abr || 0;
    return {
        itag,
        url: f.url || null,
        mimeType,
        container: f.container || ext || 'unknown',
        quality: isVideo ? `${height}p` : (f.format_note || undefined),
        bitrate: isAudio && abr ? `${abr.toFixed(0)}kbps` : undefined,
        contentLength: f.filesize ? String(f.filesize) : (f.filesize_approx ? String(f.filesize_approx) : undefined),
        audioChannels: f.audio_channels || undefined,
    };
}
async function getVideoInfo(url, opts = {}) {
    const videoId = extractYouTubeId(url);
    if (!videoId)
        throw new Error(`Invalid YouTube URL: ${url}`);
    const client = opts.client || (0, client_1.createClient)({
        headers: YT_HEADERS,
        timeout: 15000,
        cookieJar: true,
    });
    const html = await client.get(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { ...YT_HEADERS },
        responseType: 'text',
    }).then((r) => r.data);
    if (!html.includes('ytInitialPlayerResponse')) {
        throw new Error('YouTube bloqueó la solicitud (no se encontró player response)');
    }
    const playerData = parsePlayerResponse(html);
    if (!playerData)
        throw new Error('No se pudo extraer el player response');
    const details = (playerData.videoDetails || {});
    const formats = parseFormats(playerData);
    const hasAnyUrl = formats.some(f => f.url);
    const result = {
        id: videoId,
        title: details.title || '',
        author: details.author || details.ownerChannelName || '',
        lengthSeconds: Number(details.lengthSeconds) || 0,
        description: details.shortDescription || '',
        thumbnail: extractThumbnail(playerData),
        formats,
        audioFormats: formats.filter(f => f.mimeType.startsWith('audio/')),
        videoFormats: formats.filter(f => f.mimeType.startsWith('video/')),
        dashUrl: playerData.streamingData?.dashManifestUrl || null,
    };
    if (hasAnyUrl)
        return result;
    const ytDlpPath = await findOrDownloadYtDlp(opts.ytDlpPath);
    const json = await execYtDlp(ytDlpPath, ['--dump-json', url]);
    const ytDlpData = JSON.parse(json);
    const ytFormats = (ytDlpData.formats || []);
    const fullFormats = ytFormats.map(ytDlpToYouTubeFormat);
    return {
        id: videoId,
        title: ytDlpData.title || result.title,
        author: ytDlpData.channel || result.author,
        lengthSeconds: ytDlpData.duration || result.lengthSeconds,
        description: ytDlpData.description || result.description,
        thumbnail: ytDlpData.thumbnail || result.thumbnail,
        formats: fullFormats,
        audioFormats: fullFormats.filter(f => f.mimeType.startsWith('audio/')),
        videoFormats: fullFormats.filter(f => f.mimeType.startsWith('video/')),
        dashUrl: null,
    };
}
async function getDirectUrl(url, formatSelector, opts = {}) {
    const ytDlpPath = await findOrDownloadYtDlp(opts.ytDlpPath);
    const stdout = await execYtDlp(ytDlpPath, ['-g', '-f', formatSelector, url]);
    const lines = stdout.trim().split('\n');
    const parsedUrl = lines.find(l => l.startsWith('http'));
    if (!parsedUrl)
        throw new Error(`yt-dlp no devolvió una URL para el formato ${formatSelector}`);
    const itag = parseInt(formatSelector, 10) || 0;
    return { url: parsedUrl, itag };
}
async function getAudioUrl(url, opts = {}) {
    const info = await getVideoInfo(url, opts);
    const preferred = opts.preferAudioItag;
    let audio;
    if (preferred)
        audio = info.audioFormats.find(f => f.itag === preferred);
    if (!audio)
        audio = info.audioFormats.find(f => f.itag === 251);
    if (!audio)
        audio = info.audioFormats.find(f => f.itag === 140);
    if (!audio)
        audio = info.audioFormats.find(f => f.itag === 250);
    if (!audio)
        audio = info.audioFormats.find(f => f.itag === 249);
    if (!audio)
        audio = info.audioFormats.find(f => f.itag === 139);
    if (!audio)
        audio = info.audioFormats.find(f => f.itag === 141);
    if (!audio)
        audio = info.audioFormats[0];
    if (!audio)
        throw new Error('No hay formatos de audio disponibles');
    if (audio.url)
        return { url: audio.url, itag: audio.itag };
    return getDirectUrl(url, String(audio.itag), opts);
}
async function getVideoUrl(url, opts = {}) {
    const info = await getVideoInfo(url, opts);
    const preferred = opts.preferVideoItag;
    let video;
    if (preferred)
        video = info.videoFormats.find(f => f.itag === preferred);
    if (!video)
        video = info.videoFormats.find(f => f.itag === 18);
    if (!video)
        video = info.videoFormats.find(f => f.itag === 22);
    if (!video)
        video = info.videoFormats.find(f => f.itag === 137);
    if (!video)
        video = info.videoFormats[0];
    if (!video)
        throw new Error('No hay formatos de video disponibles');
    if (video.url)
        return { url: video.url, itag: video.itag };
    return getDirectUrl(url, String(video.itag), opts);
}
async function download(url, destPath, opts = {}) {
    const ytDlpPath = await findOrDownloadYtDlp(opts.ytDlpPath);
    const info = await getVideoInfo(url, opts);
    const hasDirectUrl = info.audioFormats.some(f => f.url);
    if (hasDirectUrl) {
        const { url: audioUrl } = await getAudioUrl(url, opts);
        const fs2 = await import('node:fs');
        const https2 = await import('node:https');
        const http2 = await import('node:http');
        return new Promise((resolve, reject) => {
            const protocol = audioUrl.startsWith('https') ? https2 : http2;
            protocol.get(audioUrl, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed: ${res.statusCode}`));
                    return;
                }
                const file = fs2.createWriteStream(destPath);
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
                file.on('error', reject);
            }).on('error', reject);
        });
    }
    return new Promise((resolve, reject) => {
        import('node:child_process').then(({ spawn }) => {
            const args = [
                '-f', 'bestaudio',
                '--extract-audio',
                '--audio-format', 'mp3',
                '-o', destPath,
                url,
            ];
            const proc = spawn(ytDlpPath, args, { stdio: ['ignore', 'inherit', 'inherit'] });
            proc.on('exit', (code) => {
                if (code === 0)
                    resolve();
                else
                    reject(new Error(`yt-dlp exited with code ${code}`));
            });
            proc.on('error', reject);
        });
    });
}
//# sourceMappingURL=youtube.js.map