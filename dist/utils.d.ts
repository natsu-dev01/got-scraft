export declare function rand(min: number, max: number): number;
export declare function pick<T>(arr: T[]): T | null;
export declare function sleep(ms: number): Promise<void>;
export declare function randomDelay(min?: number, max?: number): Promise<void>;
export declare function shuffle<T>(arr: T[]): T[];
export declare function shuffleObjectKeys(obj: Record<string, unknown>): Record<string, unknown>;
export declare function saveJSON(data: unknown, filePath: string): string;
export declare function loadJSON(filePath: string): unknown;
export declare function log(msg: string, data?: unknown): void;
//# sourceMappingURL=utils.d.ts.map