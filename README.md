# got-scraft

Módulo de scraping con **axios** + **cheerio**. Anti-bloqueo integrado.

## Instalación

```bash
npm install https://github.com/natsu-dev01/got-scraft.git
```

## Uso rápido

```js
const { fetch, load, getOG, getMeta } = require('got-scraft');

const html = await fetch('https://ejemplo.com');
const $ = load(html);

console.log(getOG($));       // og:title, og:image, etc
console.log(getMeta($, 'description'));
```

## API completa

### Peticiones HTTP

```js
const { fetch, fetchWithRetry, post, createClient, createSession } = require('got-scraft');

// GET simple
const html = await fetch('https://ejemplo.com');

// Con anti-bloqueo (reintentos + backoff exponencial)
const html = await fetchWithRetry('https://ejemplo.com', { retries: 5 });

// POST
const res = await post('https://ejemplo.com/api', { key: 'value' });

// Cliente personalizado con proxy
const client = createClient({
  proxy: { host: '127.0.0.1', port: 8080 },
  randomizeHeaders: true,    // headers en orden aleatorio
  lang: 'en-US,en;q=0.9',
});

// Sesión con rate limiting automático (2s entre requests)
const session = createSession({ minGap: 2000 });
const a = await session.get('https://ejemplo.com/a');
const b = await session.get('https://ejemplo.com/b'); // espera 2s
```

### Anti-bloqueo

| Función | Qué hace |
|---------|----------|
| `randomDelay(min, max)` | Pausa aleatoria |
| `shuffleObjectKeys(obj)` | Desordena keys de headers |
| `buildUA()` | User-Agent Chrome aleatorio |
| `buildSecChUa()` | Sec-Ch-Ua dinámico |
| `buildHeaders(opts)` | Headers completos camuflados |
| `isBlocked(html)` | Detecta si la respuesta está bloqueada |
| `pick(arr)` | Elemento aleatorio de array |
| `rand(min, max)` | Número aleatorio |

**createClient opciones:**

| Opción | Descripción |
|--------|-------------|
| `userAgent` | UA personalizado (o random) |
| `referer` | Referer personalizado (o random) |
| `lang` | Accept-Language personalizado |
| `proxy` | `{ host, port, protocol }` |
| `cookieFile` | Ruta a archivo con cookies |
| `cookieJar` | `false` para desactivar jar |
| `randomizeHeaders` | Mezcla orden de headers |
| `timeout` | Timeout en ms (default: 30000) |
| `headers` | Headers adicionales |

### Parseo HTML

```js
const { load, getMeta, getAllMeta, getOG, getText, getLines, matchText, stripHTML } = require('got-scraft');

const $ = load(html);

getMeta($, 'og:title');          // Meta por propiedad
getAllMeta($);                    // Todas las meta tags
getOG($);                         // Solo og: tags como objeto
getText($);                       // Texto plano del body
getLines($);                      // Líneas de texto
matchText(text, [/patrón1/, /patrón2/]); // Regex multiple
stripHTML('<p>hola</p>');        // "hola"
```

### Extracción de datos

```js
const { extractLinks, extractImages, extractScripts, extractEmails, extractNumbers } = require('got-scraft');

extractLinks($, 'https://base.url');     // Todos los links
extractImages($, 'https://base.url');    // Todas las imágenes
extractScripts($, 'https://base.url');   // Scripts externos
extractEmails(text);                     // Emails encontrados
extractNumbers(text);                    // Números encontrados
```

### Utilidades

```js
const { parseNumber, saveJSON, loadJSON, log, shuffle } = require('got-scraft');

parseNumber('1.5k');     // "1500"
parseNumber('2M');       // "2000000"
saveJSON(data, 'file.json');
loadJSON('file.json');
log('mensaje', datos);   // Log a stderr con timestamp
shuffle([1, 2, 3]);      // Array mezclado
```

### Meta scraping directo

```js
const { scrapeMeta } = require('got-scraft');

const result = await scrapeMeta('https://ejemplo.com');
// { url, title, meta: {...}, og: { title, image, ... } }
```

## Estrategias anti-bloqueo

```js
const { createSession, fetchWithRetry, randomDelay, isBlocked } = require('got-scraft');

// 1. Sesión con rate limiting
const session = createSession({ minGap: 3000 });

// 2. Reintentos con backoff exponencial
const html = await fetchWithRetry('https://ejemplo.com', { retries: 5 });

// 3. Detectar bloqueo
if (isBlocked(html)) console.log('Bloqueado!');

// 4. Delay aleatorio entre requests
await randomDelay(2000, 5000);
```

## Dependencias

- [axios](https://github.com/axios/axios)
- [cheerio](https://github.com/cheeriojs/cheerio)
- [tough-cookie](https://github.com/salesforce/tough-cookie)
- [axios-cookiejar-support](https://github.com/3846masa/axios-cookiejar-support)
