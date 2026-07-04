"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIDEO_ITAGS = exports.AUDIO_ITAGS = void 0;
exports.getVideoInfo = getVideoInfo;
exports.getAudioUrl = getAudioUrl;
exports.getVideoUrl = getVideoUrl;
exports.download = download;
exports.extractYouTubeId = extractYouTubeId;
const client_1 = require("./client");
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
    return {
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
    if (!audio.url) {
        throw new Error(`YouTube cifró las URLs de streaming. Usa yt-dlp como backend:\n` +
            `  npm install -g yt-dlp\n` +
            `  yt-dlp -f ${audio.itag}+bestaudio --extract-audio --audio-format mp3 "${url}"`);
    }
    return { url: audio.url, itag: audio.itag };
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
    if (!video.url) {
        throw new Error(`YouTube cifró las URLs de streaming. Usa yt-dlp:\n` +
            `  yt-dlp -f ${video.itag} "${url}"`);
    }
    return { url: video.url, itag: video.itag };
}
async function download(url, destPath, opts = {}) {
    const info = await getVideoInfo(url, opts);
    const hasDirectUrl = info.audioFormats.some(f => f.url);
    if (hasDirectUrl) {
        const { url: audioUrl } = await getAudioUrl(url, opts);
        const fs = await import('node:fs');
        const https = await import('node:https');
        const http = await import('node:http');
        return new Promise((resolve, reject) => {
            const protocol = audioUrl.startsWith('https') ? https : http;
            protocol.get(audioUrl, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed: ${res.statusCode}`));
                    return;
                }
                const file = fs.createWriteStream(destPath);
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
                file.on('error', reject);
            }).on('error', reject);
        });
    }
    const ytDlpPath = opts.ytDlpPath || 'yt-dlp';
    const { execFile } = await import('node:child_process');
    return new Promise((resolve, reject) => {
        const args = [
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '-o', destPath,
            url,
        ];
        const proc = execFile(ytDlpPath, args, (error) => {
            if (error)
                reject(new Error(`yt-dlp failed: ${error.message}`));
            else
                resolve();
        });
        proc.stderr?.pipe(process.stderr);
    });
}
//# sourceMappingURL=youtube.js.map