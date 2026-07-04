"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rand = rand;
exports.pick = pick;
exports.sleep = sleep;
exports.randomDelay = randomDelay;
exports.shuffle = shuffle;
exports.shuffleObjectKeys = shuffleObjectKeys;
exports.saveJSON = saveJSON;
exports.loadJSON = loadJSON;
exports.log = log;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
    if (!arr?.length)
        return null;
    return arr[rand(0, arr.length - 1)];
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function randomDelay(min = 1000, max = 3000) {
    return sleep(rand(min, max));
}
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function shuffleObjectKeys(obj) {
    const keys = shuffle(Object.keys(obj));
    return keys.reduce((acc, k) => {
        acc[k] = obj[k];
        return acc;
    }, {});
}
function saveJSON(data, filePath) {
    const resolved = node_path_1.default.resolve(filePath);
    const dir = node_path_1.default.dirname(resolved);
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
    node_fs_1.default.writeFileSync(resolved, JSON.stringify(data, null, 2), 'utf-8');
    return resolved;
}
function loadJSON(filePath) {
    return JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.resolve(filePath), 'utf-8'));
}
function log(msg, data) {
    const time = new Date().toISOString().slice(11, 19);
    process.stderr.write(`[${time}] ${msg}${data !== undefined ? ' ' + JSON.stringify(data) : ''}\n`);
}
//# sourceMappingURL=utils.js.map