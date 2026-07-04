import { createClient } from './client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as https from 'node:https';

const YT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  'DNT': '1',
};

const AUDIO_ITAGS: Record<number, { mime: string; bitrate: string; container: string }> = {
  139: { mime: 'audio/mp4', bitrate: '48kbps', container: 'm4a' },
  140: { mime: 'audio/mp4', bitrate: '128kbps', container: 'm4a' },
  141: { mime: 'audio/mp4', bitrate: '256kbps', container: 'm4a' },
  249: { mime: 'audio/webm', bitrate: '50kbps', container: 'webm' },
  250: { mime: 'audio/webm', bitrate: '70kbps', container: 'webm' },
  251: { mime: 'audio/webm', bitrate: '160kbps', container: 'webm' },
};

const VIDEO_ITAGS: Record<number, { quality: string; container: string }> = {
  18:  { quality: '360p', container: 'mp4' },
  22:  { quality: '720p', container: 'mp4' },
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

export interface YouTubeFormat {
  itag: number;
  url: string | null;
  mimeType: string;
  container: string;
  quality?: string;
  bitrate?: string;
  contentLength?: string;
  approxDurationMs?: string;
  audioChannels?: number;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  author: string;
  lengthSeconds: number;
  description: string;
  thumbnail: string;
  formats: YouTubeFormat[];
  audioFormats: YouTubeFormat[];
  videoFormats: YouTubeFormat[];
  dashUrl: string | null;
}

export interface YouTubeOptions {
  client?: ReturnType<typeof createClient>;
  preferAudioItag?: number;
  preferVideoItag?: number;
  ytDlpPath?: string;
  concurrentFragments?: number;
  downloader?: string;
  downloaderArgs?: string;
  format?: string;
  extractAudio?: boolean;
  audioFormat?: string;
  outputTemplate?: string;
}

export interface YtDlpFormat {
  format_id: string;
  format_note?: string;
  ext: string;
  url?: string;
  acodec?: string;
  vcodec?: string;
  tbr?: number;
  abr?: number;
  asr?: number;
  filesize?: number;
  filesize_approx?: number;
  width?: number;
  height?: number;
  fps?: number;
  audio_channels?: number;
  container?: string;
  protocol?: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function parsePlayerResponse(raw: string): Record<string, unknown> | null {
  try {
    const m = raw.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var|window|<\/)/);
    if (m) return JSON.parse(m[1]);
    const m2 = raw.match(/player_response["']\s*:\s*["']([^"']+)["']/);
    if (m2) return JSON.parse(Buffer.from(m2[1], 'base64').toString());
  } catch { /* ignore */ }
  return null;
}

function parseFormats(data: Record<string, unknown>): YouTubeFormat[] {
  const formats: YouTubeFormat[] = [];
  const streaming = (data.streamingData || data) as Record<string, unknown>;
  const rawFormats = (streaming.formats || data.formats || []) as Record<string, unknown>[];
  const rawAdaptive = (streaming.adaptiveFormats || data.adaptiveFormats || []) as Record<string, unknown>[];

  for (const f of [...rawFormats, ...rawAdaptive]) {
    const itag = Number(f.itag);
    let url: string | null = (f.url as string) || null;

    if (!url) {
      const cipher = (f.cipher || f.signatureCipher) as string;
      if (cipher) {
        const params = new URLSearchParams(cipher);
        url = params.get('url');
        const sp = params.get('sp') || 'signature';
        const sig = params.get('s');
        if (url && sig) url += `&${sp}=${sig}`;
      }
    }

    const mimeType = (f.mimeType as string) || '';
    const container = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : 'unknown';

    formats.push({
      itag,
      url,
      mimeType,
      container,
      quality: f.qualityLabel as string || f.quality as string,
      bitrate: AUDIO_ITAGS[itag]?.bitrate,
      contentLength: f.contentLength as string,
      approxDurationMs: f.approxDurationMs as string,
      audioChannels: f.audioChannels as number,
    });
  }

  return formats;
}

function extractThumbnail(data: Record<string, unknown>): string {
  try {
    const details = data.videoDetails as Record<string, unknown> || {};
    const thumbs = details.thumbnail as Record<string, unknown> || {};
    const urls = thumbs.thumbnails as Array<Record<string, string>> || [];
    const best = urls.reduce((a, b) => {
      const aw = Number(a.width || 0);
      const bw = Number(b.width || 0);
      return bw > aw ? b : a;
    }, urls[0] || {});
    return best.url || `https://i.ytimg.com/vi/${details.videoId}/maxresdefault.jpg`;
  } catch {
    return '';
  }
}

function getCacheDir(sub: string): string {
  const base = process.platform === 'win32'
    ? (process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'))
    : path.join(os.homedir(), '.cache');
  const dir = path.join(base, 'got-scraft', sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getYtDlpBinaryName(): string {
  if (process.platform === 'win32') return 'yt-dlp.exe';
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  return 'yt-dlp';
}

function getYtDlpDownloadUrl(): string {
  return `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${getYtDlpBinaryName()}`;
}

function getAria2Url(): { url: string; extract: boolean; innerFile?: string } {
  if (process.platform === 'win32') {
    return {
      url: 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip',
      extract: true,
      innerFile: 'aria2c.exe',
    };
  }
  if (process.platform === 'linux') {
    return {
      url: 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-linux-gnu-64bit-build1.tar.bz2',
      extract: true,
      innerFile: 'aria2c',
    };
  }
  return { url: '', extract: false };
}

function execYtDlp(binary: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    import('node:child_process').then(({ execFile }) => {
      execFile(binary, args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          const msg = stderr ? stderr.toString().split('\n').slice(0, 5).join('; ') : error.message;
          reject(new Error(`yt-dlp: ${msg}`));
        } else {
          resolve(stdout.toString());
        }
      });
    });
  });
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(res.headers.location!, destPath).then(resolve).catch(reject);
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
      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (total > 0) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          process.stderr.write(`\ryt-dlp: descargando ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB)`);
        }
      });
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        if (total > 0) process.stderr.write('\n');
        resolve();
      });
      file.on('error', (err) => {
        file.close();
        fs.unlinkSync(destPath);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function downloadYtDlp(cacheDir: string): Promise<string> {
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

async function findOrDownloadYtDlp(customPath?: string): Promise<string> {
  if (customPath) return customPath;

  const cacheDir = getCacheDir('yt-dlp');
  const cachedBinary = path.join(cacheDir, getYtDlpBinaryName());

  if (fs.existsSync(cachedBinary)) {
    try {
      await execYtDlp(cachedBinary, ['--version']);
      return cachedBinary;
    } catch {
      fs.unlinkSync(cachedBinary);
    }
  }

  try {
    await execYtDlp(getYtDlpBinaryName(), ['--version']);
    return getYtDlpBinaryName();
  } catch {
    return downloadYtDlp(cacheDir);
  }
}

function execTool(tool: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    import('node:child_process').then(({ execFile }) => {
      execFile(tool, args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          const msg = stderr ? stderr.toString().split('\n').slice(0, 3).join('; ') : error.message;
          reject(new Error(`${tool}: ${msg}`));
        } else {
          resolve(stdout.toString());
        }
      });
    });
  });
}

async function findAria2c(): Promise<string | null> {
  const systemName = process.platform === 'win32' ? 'aria2c.exe' : 'aria2c';
  const simpleName = 'aria2c';

  const cached = path.join(getCacheDir('aria2'), systemName);
  if (fs.existsSync(cached)) {
    try {
      await execTool(cached, ['--version']);
      return cached;
    } catch {
      fs.unlinkSync(cached);
    }
  }

  try {
    await execTool(systemName, ['--version']);
    return simpleName;
  } catch {
    return null;
  }
}

async function downloadAria2(): Promise<string | null> {
  const info = getAria2Url();
  if (!info.url) return null;

  const aria2Dir = getCacheDir('aria2');
  const destName = process.platform === 'win32' ? 'aria2c.exe' : 'aria2c';
  const destPath = path.join(aria2Dir, destName);

  if (fs.existsSync(destPath)) {
    try {
      await execTool(destPath, ['--version']);
      return destPath;
    } catch {
      fs.unlinkSync(destPath);
    }
  }

  process.stderr.write(`aria2: descargando desde GitHub...\n`);
  const tmpZip = path.join(aria2Dir, 'aria2_dl');
  await downloadFile(info.url, tmpZip);

  if (info.extract && info.innerFile) {
    if (process.platform === 'win32') {
      await execTool('powershell', [
        '-Command',
        `Expand-Archive -Path "${tmpZip}" -DestinationPath "${aria2Dir}" -Force`
      ]);
      const extracted = path.join(aria2Dir, info.innerFile);
      if (fs.existsSync(extracted)) {
        fs.unlinkSync(tmpZip);
        try { await execTool(destPath, ['--version']); } catch { /* ignore */ }
        return extracted;
      }
      const subDirs = fs.readdirSync(aria2Dir).filter(d => d.startsWith('aria2-'));
      for (const sub of subDirs) {
        const sp = path.join(aria2Dir, sub, info.innerFile);
        if (fs.existsSync(sp)) {
          fs.renameSync(sp, destPath);
          fs.rmSync(path.join(aria2Dir, sub), { recursive: true, force: true });
          fs.unlinkSync(tmpZip);
          try { await execTool(destPath, ['--version']); } catch { /* ignore */ }
          return destPath;
        }
      }
    } else if (process.platform === 'linux') {
      const tarDest = path.join(aria2Dir, 'aria2_extracted');
      if (!fs.existsSync(tarDest)) fs.mkdirSync(tarDest, { recursive: true });
      await execTool('tar', ['-xjf', tmpZip, '-C', tarDest]);
      const found = findFileRecursive(tarDest, info.innerFile);
      if (found) {
        fs.renameSync(found, destPath);
        fs.chmodSync(destPath, 0o755);
        fs.rmSync(tarDest, { recursive: true, force: true });
        fs.unlinkSync(tmpZip);
        try { await execTool(destPath, ['--version']); } catch { /* ignore */ }
        return destPath;
      }
      fs.rmSync(tarDest, { recursive: true, force: true });
    }
    fs.unlinkSync(tmpZip);
  }

  return null;
}

function findFileRecursive(dir: string, target: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, target);
      if (found) return found;
    } else if (entry.name === target) {
      return fullPath;
    }
  }
  return null;
}

function ytDlpToYouTubeFormat(f: Record<string, unknown>): YouTubeFormat {
  const itag = parseInt(f.format_id as string, 10) || 0;
  const ext = f.ext as string || '';
  const vcodec = f.vcodec as string || '';
  const acodec = f.acodec as string || '';
  const mimeType = ext === 'mp4' ? `video/mp4; codecs="${vcodec || acodec || 'avc1'}"`
    : ext === 'webm' ? `video/webm; codecs="${vcodec || acodec || 'vp9'}"`
    : `${ext}/unknown`;
  const isAudio = vcodec === 'none' && acodec !== 'none';
  const isVideo = acodec === 'none' && vcodec !== 'none';
  const height = f.height as number || 0;
  const abr = f.abr as number || 0;

  return {
    itag,
    url: (f.url as string) || null,
    mimeType,
    container: (f.container as string) || ext || 'unknown',
    quality: isVideo ? `${height}p` : (f.format_note as string || undefined),
    bitrate: isAudio && abr ? `${abr.toFixed(0)}kbps` : undefined,
    contentLength: f.filesize ? String(f.filesize) : (f.filesize_approx ? String(f.filesize_approx) : undefined),
    audioChannels: f.audio_channels as number || undefined,
  };
}

export async function getVideoInfo(url: string, opts: YouTubeOptions = {}): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error(`Invalid YouTube URL: ${url}`);

  const client = opts.client || createClient({
    headers: YT_HEADERS,
    timeout: 15000,
    cookieJar: true,
  });

  const html = await client.get(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { ...YT_HEADERS },
    responseType: 'text',
  }).then((r: { data: string }) => r.data);

  if (!html.includes('ytInitialPlayerResponse')) {
    throw new Error('YouTube bloqueó la solicitud (no se encontró player response)');
  }

  const playerData = parsePlayerResponse(html);
  if (!playerData) throw new Error('No se pudo extraer el player response');

  const details = (playerData.videoDetails || {}) as Record<string, unknown>;
  const formats = parseFormats(playerData);
  const hasAnyUrl = formats.some(f => f.url);

  const result: YouTubeVideoInfo = {
    id: videoId,
    title: (details.title as string) || '',
    author: (details.author as string) || (details.ownerChannelName as string) || '',
    lengthSeconds: Number(details.lengthSeconds) || 0,
    description: (details.shortDescription as string) || '',
    thumbnail: extractThumbnail(playerData),
    formats,
    audioFormats: formats.filter(f => f.mimeType.startsWith('audio/')),
    videoFormats: formats.filter(f => f.mimeType.startsWith('video/')),
    dashUrl: ((playerData.streamingData as Record<string, unknown>)?.dashManifestUrl as string) || null,
  };

  if (hasAnyUrl) return result;

  const ytDlpPath = await findOrDownloadYtDlp(opts.ytDlpPath);
  const json = await execYtDlp(ytDlpPath, ['--dump-json', url]);
  const ytDlpData: Record<string, unknown> = JSON.parse(json);
  const ytFormats = (ytDlpData.formats || []) as Record<string, unknown>[];
  const fullFormats = ytFormats.map(ytDlpToYouTubeFormat);

  return {
    id: videoId,
    title: (ytDlpData.title as string) || result.title,
    author: (ytDlpData.channel as string) || result.author,
    lengthSeconds: (ytDlpData.duration as number) || result.lengthSeconds,
    description: (ytDlpData.description as string) || result.description,
    thumbnail: (ytDlpData.thumbnail as string) || result.thumbnail,
    formats: fullFormats,
    audioFormats: fullFormats.filter(f => f.mimeType.startsWith('audio/')),
    videoFormats: fullFormats.filter(f => f.mimeType.startsWith('video/')),
    dashUrl: null,
  };
}

export async function ensureAria2c(): Promise<string | null> {
  const aria2Name = process.platform === 'win32' ? 'aria2c.exe' : 'aria2c';
  const existing = await findAria2c();
  if (existing) return existing;
  return downloadAria2();
}

export async function getDirectUrl(
  url: string,
  formatSelector: string,
  opts: YouTubeOptions = {}
): Promise<{ url: string; itag: number }> {
  const ytDlpPath = await findOrDownloadYtDlp(opts.ytDlpPath);
  const stdout = await execYtDlp(ytDlpPath, ['-g', '-f', formatSelector, url]);
  const lines = stdout.trim().split('\n');
  const parsedUrl = lines.find(l => l.startsWith('http'));
  if (!parsedUrl) throw new Error(`yt-dlp no devolvió una URL para el formato ${formatSelector}`);
  const itag = parseInt(formatSelector, 10) || 0;
  return { url: parsedUrl, itag };
}

export async function getAudioUrl(url: string, opts: YouTubeOptions = {}): Promise<{ url: string; itag: number }> {
  const info = await getVideoInfo(url, opts);
  const preferred = opts.preferAudioItag;
  let audio: YouTubeFormat | undefined;

  if (preferred) audio = info.audioFormats.find(f => f.itag === preferred);
  if (!audio) audio = info.audioFormats.find(f => f.itag === 251);
  if (!audio) audio = info.audioFormats.find(f => f.itag === 140);
  if (!audio) audio = info.audioFormats.find(f => f.itag === 250);
  if (!audio) audio = info.audioFormats.find(f => f.itag === 249);
  if (!audio) audio = info.audioFormats.find(f => f.itag === 139);
  if (!audio) audio = info.audioFormats.find(f => f.itag === 141);
  if (!audio) audio = info.audioFormats[0];

  if (!audio) throw new Error('No hay formatos de audio disponibles');

  if (audio.url) return { url: audio.url, itag: audio.itag };

  return getDirectUrl(url, String(audio.itag), opts);
}

export async function getVideoUrl(url: string, opts: YouTubeOptions = {}): Promise<{ url: string; itag: number }> {
  const info = await getVideoInfo(url, opts);
  const preferred = opts.preferVideoItag;
  let video: YouTubeFormat | undefined;

  if (preferred) video = info.videoFormats.find(f => f.itag === preferred);
  if (!video) video = info.videoFormats.find(f => f.itag === 18);
  if (!video) video = info.videoFormats.find(f => f.itag === 22);
  if (!video) video = info.videoFormats.find(f => f.itag === 137);
  if (!video) video = info.videoFormats[0];

  if (!video) throw new Error('No hay formatos de video disponibles');

  if (video.url) return { url: video.url, itag: video.itag };

  return getDirectUrl(url, String(video.itag), opts);
}

export async function download(
  url: string,
  destPath: string,
  opts: YouTubeOptions = {}
): Promise<void> {
  const ytDlpPath = await findOrDownloadYtDlp(opts.ytDlpPath);
  const concurrent = opts.concurrentFragments ?? 10;

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

  const ytArgs: string[] = [
    '-f', opts.format || 'bestaudio',
    '--concurrent-fragments', String(concurrent),
    '-o', opts.outputTemplate || destPath,
    url,
  ];

  if (opts.extractAudio !== false && !opts.format) {
    ytArgs.push('--extract-audio');
    ytArgs.push('--audio-format', opts.audioFormat || 'mp3');
  }

  if (opts.downloader) {
    const dlBase = path.basename(opts.downloader);
    const dlName = path.basename(dlBase, path.extname(dlBase));
    ytArgs.push('--downloader', opts.downloader);
    if (opts.downloaderArgs) {
      ytArgs.push('--downloader-args', `${dlName}:${opts.downloaderArgs}`);
    }
  }

  return new Promise((resolve, reject) => {
    import('node:child_process').then(({ spawn }) => {
      const proc = spawn(ytDlpPath, ytArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp exited with code ${code}`));
      });
      proc.on('error', reject);
    });
  });
}

export {
  extractYouTubeId,
  AUDIO_ITAGS,
  VIDEO_ITAGS,
};
