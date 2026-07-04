/**
 * @fileoverview Fábrica de clientes HTTP y sesiones con anti-detección.
 */

const axios = require('axios');
const { buildHeaders } = require('./headers');
const { cacheBust, Throttler, ProxyRotator } = require('./anti');
const { sleep } = require('./utils');

/**
 * Crea un cliente axios con headers camuflados y configuración anti-bloqueo.
 * @param {Object} [opts] - Opciones de configuración.
 * @param {number} [opts.timeout=30000] - Timeout en ms.
 * @param {boolean} [opts.cookieJar=true] - Habilitar cookie jar.
 * @param {string} [opts.cookieFile] - Ruta a archivo de cookies.
 * @param {object|string} [opts.proxy] - Configuración de proxy.
 * @param {object} [opts.httpsAgent] - Agente HTTPS personalizado.
 * @param {object} [opts.httpAgent] - Agente HTTP personalizado.
 * @param {number} [opts.maxRedirects=5] - Máximo de redirects.
 * @param {Function} [opts.validateStatus] - Función de validación de status.
 * @param {boolean} [opts.randomizeHeaders] - Mezclar orden de headers.
 * @param {boolean} [opts.cacheBust] - Agregar X-Request-Id.
 * @param {string} [opts.userAgent] - User-Agent personalizado.
 * @param {string} [opts.lang] - Accept-Language personalizado.
 * @param {string} [opts.referer] - Referer personalizado.
 * @param {Record<string,string>} [opts.headers] - Headers adicionales.
 * @returns {import('axios').AxiosInstance} Cliente axios configurado.
 */
function createClient(opts = {}) {
  const config = {
    timeout: opts.timeout || 30000,
    headers: buildHeaders(opts),
    decompress: true,
    maxRedirects: opts.maxRedirects || 5,
    validateStatus: opts.validateStatus || (status => status < 500),
  };

  if (opts.proxy) {
    if (typeof opts.proxy === 'string') {
      const rotator = new ProxyRotator();
      const parsed = rotator.parse(opts.proxy);
      if (typeof parsed === 'string') {
        config.httpsAgent = new (require('https-proxy-agent').HttpsProxyAgent)(parsed);
      } else {
        config.proxy = parsed;
      }
    } else {
      config.proxy = opts.proxy;
    }
  }

  if (opts.httpsAgent) config.httpsAgent = opts.httpsAgent;
  if (opts.httpAgent) config.httpAgent = opts.httpAgent;

  if (opts.cookieJar !== false) {
    try {
      const tough = require('tough-cookie');
      config.jar = new tough.CookieJar();
      config.withCredentials = true;
    } catch {
      // tough-cookie no instalado, ignorar
    }
  }

  if (opts.cookieFile) {
    try {
      const { cookiesFromFile } = require('./cookies');
      const cookie = cookiesFromFile(opts.cookieFile);
      if (cookie) config.headers.Cookie = cookie;
    } catch {
      // Error al leer cookies, ignorar
    }
  }

  const client = axios.create(config);

  if (opts.cookieJar !== false) {
    try {
      require('axios-cookiejar-support')(client);
    } catch {
      // axios-cookiejar-support no instalado, ignorar
    }
  }

  return client;
}

/**
 * Crea una sesión completa con rate limiting, cookies persistentes
 * y rotación de proxies.
 * @param {Object} [opts] - Opciones de la sesión.
 * @param {number} [opts.minGap=2000] - Gap mínimo entre requests (ms).
 * @param {number} [opts.maxRPM=30] - Máximo de requests por minuto.
 * @param {ProxyRotator} [opts.proxyRotator] - Rotador de proxies.
 * @param {Throttler} [opts.throttler] - Limitador de tasa personalizado.
 * @param {boolean} [opts.cookieJar=true] - Habilitar cookies.
 * @returns {Session} Objeto sesión.
 */
function createSession(opts = {}) {
  const client = createClient({ ...opts, cookieJar: opts.cookieJar !== false });
  const throttler = opts.throttler || new Throttler(opts.maxRPM || 30);
  const rotator = opts.proxyRotator || null;
  let lastRequest = 0;

  /** @typedef {Object} Session */
  return {
    client,
    throttler,
    rotator,

    /**
     * GET request con rate limiting automático.
     * @param {string} url - URL a consultar.
     * @param {Object} [reqOpts] - Opciones adicionales.
     * @returns {Promise<string>} HTML de respuesta.
     */
    async get(url, reqOpts = {}) {
      await throttler.wait();

      const now = Date.now();
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      const elapsed = now - lastRequest;

      if (elapsed < minGap) {
        await sleep(minGap - elapsed);
      }

      lastRequest = Date.now();
      const finalUrl = reqOpts.cacheBust !== false ? cacheBust(url) : url;
      const { data } = await client.get(finalUrl, {
        responseType: reqOpts.responseType || 'text',
      });

      return data;
    },

    /**
     * POST request con rate limiting automático.
     * @param {string} url - URL.
     * @param {*} body - Cuerpo de la petición.
     * @param {Object} [reqOpts] - Opciones adicionales.
     * @returns {Promise<string>} Respuesta.
     */
    async post(url, body, reqOpts = {}) {
      await throttler.wait();

      const now = Date.now();
      const minGap = reqOpts.minGap || opts.minGap || 2000;
      const elapsed = now - lastRequest;

      if (elapsed < minGap) {
        await sleep(minGap - elapsed);
      }

      lastRequest = Date.now();
      const { data } = await client.post(url, body, {
        headers: { 'Content-Type': reqOpts.contentType || 'application/x-www-form-urlencoded' },
        responseType: reqOpts.responseType || 'text',
      });

      return data;
    },

    /**
     * Rota al siguiente proxy disponible.
     */
    rotateProxy() {
      if (!this.rotator) return;

      const next = this.rotator.next();
      if (!next) return;

      const parsed = this.rotator.parse(next);

      if (typeof parsed === 'string') {
        client.defaults.httpsAgent = this.rotator.getAgent(next);
        delete client.defaults.proxy;
      } else {
        client.defaults.proxy = parsed;
        delete client.defaults.httpsAgent;
      }
    },
  };
}

module.exports = { createClient, createSession };
