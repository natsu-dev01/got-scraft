import fs from 'node:fs';
import path from 'node:path';

export function cookiesFromFile(filePath: string): string {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf8').trim();
  } catch { return ''; }
}

export function cookiesFromNetscape(filePath: string): string {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    const cookies: string[] = [];
    for (const line of content.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;
      const parts = line.trim().split('\t');
      if (parts.length >= 7) {
        cookies.push(`${parts[5]}=${parts[6]}`);
      }
    }
    return cookies.join('; ');
  } catch { return ''; }
}

export function cookiesFromBrowser(filePath: string): string {
  return cookiesFromNetscape(filePath);
}

export function cookiesToHeader(cookies: string | string[]): string {
  if (Array.isArray(cookies)) return cookies.join('; ');
  return cookies;
}

export function mergeCookies(...cookies: (string | undefined)[]): string {
  const map: Record<string, string> = {};
  for (const c of cookies) {
    if (!c) continue;
    c.split(';').forEach(pair => {
      const [k, ...v] = pair.trim().split('=');
      if (k) map[k.trim()] = v.join('=');
    });
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}
