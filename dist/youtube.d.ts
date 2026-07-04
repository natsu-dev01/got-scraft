import { createClient } from './client';
declare const AUDIO_ITAGS: Record<number, {
    mime: string;
    bitrate: string;
    container: string;
}>;
declare const VIDEO_ITAGS: Record<number, {
    quality: string;
    container: string;
}>;
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
declare function extractYouTubeId(url: string): string | null;
export declare function getVideoInfo(url: string, opts?: YouTubeOptions): Promise<YouTubeVideoInfo>;
export declare function ensureAria2c(): Promise<string | null>;
export declare function getDirectUrl(url: string, formatSelector: string, opts?: YouTubeOptions): Promise<{
    url: string;
    itag: number;
}>;
export declare function getAudioUrl(url: string, opts?: YouTubeOptions): Promise<{
    url: string;
    itag: number;
}>;
export declare function getVideoUrl(url: string, opts?: YouTubeOptions): Promise<{
    url: string;
    itag: number;
}>;
export declare function download(url: string, destPath: string, opts?: YouTubeOptions): Promise<void>;
export { extractYouTubeId, AUDIO_ITAGS, VIDEO_ITAGS, };
//# sourceMappingURL=youtube.d.ts.map