/**
 * @fileovercraft Funciones HTTP con anti-detección, reintentos
 * automáticos y backoff exponencial.
 */

const { createClient } = require('./client');
const { cacheBust } = require('./anti');
const { randomDelay, sleep, rand } = require('./utils');

/**
 * GET request simple con opciones anti-bloqueo.
 * @param {string} url - URL a consultar.
 * @param {Object} [opts] - Opciones.
 * @param {import('axios').AxiosInstance} [opts.client] - Cliente axios reusable.
 * @param {boolean} [opts.cacheBust] - Evitar caché.
 * @param {boolean} [opts.delay] - Agregar delay aleatorio.
 * @param {number} [opts.delayMin=500] - Delay mínimo.
 * @param {number} [opts.delayMax=2000] - Delay máximo.
 * @param {Object} [opts.throttler] - Limitador de tasa.
 * @param {string} [opts.responseType='text'] - Tipo de respuesta.
 * @returns {Promise<string>} HTML de respuesta.
 */
async function fetch(url, opts = {}) {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  if (opts.delay) {
    await randomDelay(opts.delayMin || 500, opts.delayMax || 2000);
  }

  if (opts.throttler) {
    await opts.throttler.wait();
  }

  const { data } = await client.get(finalUrl, {
    responseType: opts.responseType || 'text',
  });

  return data;
}

/**
 * GET request con reintentos automáticos, backoff exponencial
 * y rotación de proxies en errores.
 * @param {string} url - URL a consultar.
 * @param {Object} [opts] - Opciones.
 * @param {number} [opts.retries=3] - Número máximo de reintentos.
 * @param {import('axios').AxiosInstance} [opts.client] - Cliente axios.
 * @param {boolean} [opts.cacheBust] - Evitar caché.
 * @param {boolean} [opts.delay] - Delay entre reintentos.
 * @param {number} [opts.delayMin=1000] - Delay mínimo.
 * @param {number} [opts.delayMax=3000] - Delay máximo.
 * @param {Object} [opts.throttler] - Limitador de tasa.
 * @param {Object} [opts.proxyRotator] - Rotador de proxies.
 * @param {boolean} [opts.rotateOnError=true] - Rotar proxy en error.
 * @param {string} [opts.responseType='text'] - Tipo de respuesta.
 * @returns {Promise<string>} HTML de respuesta.
 * @throws {Error} Si todos los reintentos fallan.
 */
async function fetchWithRetry(url, opts = {}) {
  const maxRetries = opts.retries || 3;
  const client = opts.client || createClient({ ...opts, cookieJar: false });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const finalUrl = opts.cacheBust ? cacheBust(url) : url;

      if (opts.throttler) {
        await opts.throttler.wait();
      }

      if (opts.delay && attempt > 0) {
        await randomDelay(opts.delayMin || 1000, opts.delayMax || 3000);
      }

      const { data } = await client.get(finalUrl, {
        responseType: opts.responseType || 'text',
      });

      return data;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Rotar proxy si está configurado
      if (opts.proxyRotator && opts.rotateOnError !== false) {
        const nextProxy = opts.proxyRotator.next();
        if (nextProxy) {
          const parsed = opts.proxyRotator.parse(nextProxy);

          if (typeof parsed === 'string') {
            client.defaults.httpsAgent = opts.proxyRotator.getAgent(nextProxy);
            delete client.defaults.proxy;
          } else {
            client.defaults.proxy = parsed;
            delete client.defaults.httpsAgent;
          }
        }
      }

      // Backoff exponencial con jitter
      const waitTime = Math.min(
        1000 * Math.pow(2, attempt) + rand(0, 2000),
        30000
      );

      await sleep(waitTime);
    }
  }
}

/**
 * POST request con opciones anti-bloqueo.
 * @param {string} url - URL.
 * @param {*} body - Cuerpo de la petición.
 * @param {Object} [opts] - Opciones.
 * @param {import('axios').AxiosInstance} [opts.client] - Cliente axios.
 * @param {boolean} [opts.cacheBust] - Evitar caché.
 * @param {Object} [opts.throttler] - Limitador de tasa.
 * @param {string} [opts.contentType='application/x-www-form-urlencoded'] - Content-Type.
 * @param {string} [opts.responseType='text'] - Tipo de respuesta.
 * @returns {Promise<string>} Respuesta.
 */
async function post(url, body, opts = {}) {
  const client = opts.client || createClient(opts);
  const finalUrl = opts.cacheBust ? cacheBust(url) : url;

  if (opts.throttler) {
    await opts.throttler.wait();
  }

  const { data } = await client.post(finalUrl, body, {
    headers: {
      'Content-Type': opts.contentType || 'application/x-www-form-urlencoded',
    },
    responseType: opts.responseType || 'text',
  });

  return data;
}

module.exports = { fetch, fetchWithRetry, post };
