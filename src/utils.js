/**
 * @fileoverview Utilidades generales para el módulo got-scraft.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Genera un número entero aleatorio entre min y max (inclusive).
 * @param {number} min - Valor mínimo.
 * @param {number} max - Valor máximo.
 * @returns {number} Entero aleatorio.
 */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Selecciona un elemento aleatorio de un arreglo.
 * @template T
 * @param {T[]} arr - Arreglo de elementos.
 * @returns {T|null} Elemento aleatorio o null si el arreglo está vacío.
 */
function pick(arr) {
  if (!arr?.length) return null;
  return arr[rand(0, arr.length - 1)];
}

/**
 * Pausa la ejecución por una cantidad de milisegundos.
 * @param {number} ms - Milisegundos a esperar.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pausa aleatoria entre un rango de milisegundos.
 * @param {number} [min=1000] - Mínimo de milisegundos.
 * @param {number} [max=3000] - Máximo de milisegundos.
 * @returns {Promise<void>}
 */
function randomDelay(min = 1000, max = 3000) {
  return sleep(rand(min, max));
}

/**
 * Mezcla los elementos de un arreglo (Fisher-Yates).
 * @template T
 * @param {T[]} arr - Arreglo a mezclar.
 * @returns {T[]} Nuevo arreglo mezclado.
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Mezcla las keys de un objeto.
 * @param {Record<string, any>} obj - Objeto a mezclar.
 * @returns {Record<string, any>} Nuevo objeto con keys en orden aleatorio.
 */
function shuffleObjectKeys(obj) {
  const keys = shuffle(Object.keys(obj));
  return keys.reduce((acc, k) => {
    acc[k] = obj[k];
    return acc;
  }, {});
}

/**
 * Guarda un objeto como JSON en disco.
 * @param {any} data - Datos a guardar.
 * @param {string} filePath - Ruta del archivo.
 * @returns {string} Ruta del archivo guardado.
 */
function saveJSON(data, filePath) {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, JSON.stringify(data, null, 2), 'utf-8');
  return resolved;
}

/**
 * Lee y parsea un archivo JSON.
 * @param {string} filePath - Ruta del archivo.
 * @returns {any} Datos parseados.
 */
function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
}

/**
 * Imprime un mensaje de log en stderr con timestamp.
 * @param {string} msg - Mensaje a mostrar.
 * @param {any} [data] - Datos adicionales opcionales.
 */
function log(msg, data) {
  const time = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[${time}] ${msg}${data !== undefined ? ' ' + JSON.stringify(data) : ''}\n`);
}

module.exports = { rand, pick, sleep, randomDelay, shuffle, shuffleObjectKeys, saveJSON, loadJSON, log };
