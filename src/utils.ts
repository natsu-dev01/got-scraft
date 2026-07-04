import fs from 'node:fs';
import path from 'node:path';

export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T | null {
  if (!arr?.length) return null;
  return arr[rand(0, arr.length - 1)];
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomDelay(min = 1000, max = 3000): Promise<void> {
  return sleep(rand(min, max));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const keys = shuffle(Object.keys(obj));
  return keys.reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = obj[k];
    return acc;
  }, {});
}

export function saveJSON(data: unknown, filePath: string): string {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, JSON.stringify(data, null, 2), 'utf-8');
  return resolved;
}

export function loadJSON(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
}

export function log(msg: string, data?: unknown): void {
  const time = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[${time}] ${msg}${data !== undefined ? ' ' + JSON.stringify(data) : ''}\n`);
}
