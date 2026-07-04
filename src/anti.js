/**
 * @fileoverview Sistema anti-bloqueo con rotación de proxies,
 * limitación de tasa, cache busting y detección de bloqueos.
 */

const fs = require('node:fs');
const path = require('node:path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { rand, pick, sleep } = require('./utils');

/**
 * Rotador automático de proxies.
 * Soporta HTTP, HTTPS, SOCKS4 y SOCKS5.
 * Puede cargar proxies desde archivo o arreglo.
 */
class ProxyRotator {
  /**
   * @param {string[]} [proxies=[]] - Lista inicial de proxies.
   */
  constructor(proxies = []) {
    /** @private */
    this._proxies = proxies;
    /** @private */
    this._index = 0;
  }

  /**
   * Carga proxies desde un archivo de texto (uno por línea).
   * @param {string} filePath - Ruta al archivo.
   * @returns {this} Para encadenamiento.
   */
  loadFromFile(filePath) {
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      this._proxies = content.split('\n').map(l => l.trim()).filter(Boolean);
    } catch {
      // Archivo no encontrado, ignorar
    }
    return this;
  }

  /**
   * Carga proxies desde un arreglo.
   * @param {string[]} arr - Arreglo de proxies.
   * @returns {this} Para encadenamiento.
   */
  loadFromArray(arr) {
    this._proxies = [...arr];
    return this;
  }

  /**
   * Agrega un proxy a la lista.
   * @param {string} proxy - Proxy en formato host:puerto.
   * @returns {this} Para encadenamiento.
   */
  add(proxy) {
    this._proxies.push(proxy);
    return this;
  }

  /**
   * Obtiene el siguiente proxy de la lista (round-robin).
   * @returns {string|null} Proxy o null si la lista está vacía.
   */
  next() {
    if (!this._proxies.length) return null;
    const proxy = this._proxies[this._index % this._proxies.length];
    this._index++;
    return proxy;
  }

  /**
   * Obtiene un proxy aleatorio.
   * @returns {string|null} Proxy aleatorio o null.
   */
  random() {
    if (!this._proxies.length) return null;
    return pick(this._proxies);
  }

  /**
   * Parsea un string de proxy a objeto de configuración.
   * @param {string} proxyStr - Proxy en formato host:puerto o URL completa.
   * @returns {object|string} Configuración de proxy.
   */
  parse(proxyStr) {
    if (typeof proxyStr === 'object') return proxyStr;

    if (proxyStr.startsWith('socks4://') || proxyStr.startsWith('socks5://') || proxyStr.startsWith('http://')) {
      return proxyStr;
    }

    const parts = proxyStr.split(':');
    return {
      host: parts[0],
      port: parseInt(parts[1] || '8080', 10),
      protocol: 'http',
    };
  }

  /**
   * Crea un agente HTTPS/SOCKS para el proxy dado.
   * @param {string} proxyStr - Proxy.
   * @returns {object|null} Agente o null.
   */
  getAgent(proxyStr) {
    if (!proxyStr) return null;

    if (proxyStr.startsWith('socks4://') || proxyStr.startsWith('socks5://')) {
      return new SocksProxyAgent(proxyStr);
    }

    const fullUrl = proxyStr.startsWith('http') ? proxyStr : `http://${proxyStr}`;
    return new HttpsProxyAgent(fullUrl);
  }

  /**
   * Obtiene el agente del siguiente proxy.
   * @returns {object|null} Agente o null.
   */
  nextAgent() {
    const proxy = this.next();
    return proxy ? this.getAgent(proxy) : null;
  }

  /**
   * Obtiene el agente de un proxy aleatorio.
   * @returns {object|null} Agente o null.
   */
  randomAgent() {
    const proxy = this.random();
    return proxy ? this.getAgent(proxy) : null;
  }

  /**
   * Cantidad de proxies en la lista.
   * @returns {number}
   */
  get count() {
    return this._proxies.length;
  }
}

/**
 * Limitador de tasa de requests (requests por minuto).
 * Evita ser baneado por rate limiting.
 */
class Throttler {
  /**
   * @param {number} [maxRPM=30] - Máximo de requests por minuto.
   */
  constructor(maxRPM = 30) {
    this._maxRPM = maxRPM;
    /** @private */
    this._timestamps = [];
  }

  /**
   * Espera si es necesario para no exceder el límite.
   * @returns {Promise<void>}
   */
  async wait() {
    const now = Date.now();
    this._timestamps = this._timestamps.filter(t => now - t < 60000);

    if (this._timestamps.length >= this._maxRPM) {
      const waitTime = this._timestamps[0] + 60000 - now;
      if (waitTime > 0) {
        await sleep(waitTime + rand(0, 2000));
      }
    }

    this._timestamps.push(Date.now());
  }

  /**
   * Cambia el límite máximo de RPM.
   * @param {number} val - Nuevo límite.
   */
  set max(val) {
    this._maxRPM = val;
  }

  /** @returns {number} RPM actual. */
  get max() {
    return this._maxRPM;
  }
}

/**
 * Agrega un parámetro único a la URL para evitar caché.
 * @param {string} url - URL original.
 * @returns {string} URL con cache buster.
 */
function cacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}${rand(100, 999)}`;
}

/**
 * Detecta si el HTML contiene señales de bloqueo.
 * @param {string} html - HTML de la respuesta.
 * @returns {boolean} True si parece bloqueado.
 */
function isBlocked(html) {
  if (!html || typeof html !== 'string') return false;

  const signals = [
    'checkpoint', 'block', 'captcha', 'access denied', 'please wait',
    'automated requests', 'unusual traffic', 'verify you are human',
    'just a moment', 'cf-browser-verify', 'attention required',
    'you have been blocked', 'too many requests', '429',
    'your request has been blocked', 'sorry, you have been blocked',
    'our systems have detected unusual traffic', 'enter the code below',
    'security check', 'prove you\'re not a robot', 'js-challenge',
    'cf-challenge', 'ddos-guard', 'perimeterx', 'blocked because of malicious activity',
  ];

  const normalized = html.toLowerCase();
  return signals.some(signal => normalized.includes(signal));
}

/**
 * Inspecciona una respuesta de axios y devuelve un resumen.
 * @param {import('axios').AxiosResponse} response - Respuesta de axios.
 * @returns {object} Resumen de la respuesta.
 */
function inspectResponse(response) {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    blocked: [429, 403, 503].includes(response.status),
    redirected: response.request?.res?.responseUrl !== response.config?.url,
    finalUrl: response.request?.res?.responseUrl,
    size: String(response.data?.length || 0),
  };
}

module.exports = { ProxyRotator, Throttler, cacheBust, isBlocked, inspectResponse };
