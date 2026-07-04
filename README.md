# got-scraft

Módulo profesional de scraping con **axios** + **cheerio**. Anti-bloqueo integrado para cualquier sitio web.

```
npm install https://github.com/natsu-dev01/got-scraft.git
```

```js
// CommonJS
const got = require('got-scraft');

// ES Modules
import got from 'got-scraft';
```

## Estructura

```
got-scraft/
├── src/
│   ├── index.js      ← Entry point (CJS)
│   ├── index.mjs     ← Entry point (ESM)
│   ├── client.js     ← Cliente HTTP y sesiones
│   ├── http.js       ← fetch, fetchWithRetry, post
│   ├── headers.js    ← Headers camuflados y perfiles
│   ├── parser.js     ← Cheerio, meta tags, texto
│   ├── extract.js    ← Extractores de datos
│   ├── anti.js       ← ProxyRotator, Throttler, cacheBust
│   ├── cookies.js    ← Manejo de cookies
│   └── utils.js      ← Utilidades generales
├── types/
│   └── index.d.ts    ← TypeScript definitions
├── examples/          ← Ejemplos de uso
├── package.json
└── README.md
```

## Anti-bloqueo

### Proxy rotatorio

```js
const got = require('got-scraft');

const rotator = new got.ProxyRotator()
  .loadFromFile('./proxies.txt')
  .add('127.0.0.1:8080');

// Rotación automática en errores
const html = await got.fetchWithRetry('https://ejemplo.com', {
  proxyRotator: rotator,
  retries: 5,
  rotateOnError: true,
});
```

### Rate limiting

```js
const got = require('got-scraft');

const throttler = new got.Throttler(20); // 20 req/min

const html = await got.fetch('https://ejemplo.com', { throttler });
```

### Cache busting

```js
const got = require('got-scraft');

// Auto: agrega ?_=timestamp a cada URL
await got.fetch('https://ejemplo.com', { cacheBust: true });

// Manual
const url = got.cacheBust('https://ejemplo.com');
```

### Sesión completa

```js
const got = require('got-scraft');

const session = got.createSession({
  minGap: 3000,          // 3s entre requests
  maxRPM: 15,            // 15 requests/minuto
  cacheBust: true,
  cookieJar: true,
  randomizeHeaders: true,
});

const a = await session.get('https://ejemplo.com/a');
const b = await session.get('https://ejemplo.com/b');
```

### Detectar bloqueo

```js
const got = require('got-scraft');

const html = await got.fetch('https://ejemplo.com');

if (got.isBlocked(html)) {
  console.log('Respuesta bloqueada');
}

// Inspeccionar respuesta completa
const response = await got.axios.get('https://ejemplo.com');
console.log(got.inspectResponse(response));
```

## API completa

### HTTP

| Función | Descripción |
|---------|-------------|
| `fetch(url, opts?)` | GET request |
| `fetchWithRetry(url, opts?)` | GET con reintentos + backoff |
| `post(url, body, opts?)` | POST request |
| `createClient(opts?)` | Cliente axios reusable |
| `createSession(opts?)` | Sesión con rate limit + cookies |

### HTML

| Función | Descripción |
|---------|-------------|
| `load(html, opts?)` | Carga HTML (auto-detect encoding) |
| `getMeta($, prop)` | Meta tag por propiedad |
| `getAllMeta($)` | Todas las meta tags |
| `getOG($)` | Tags Open Graph (og:*) |
| `getText($)` | Texto plano del body |
| `getLines($)` | Líneas de texto no vacías |
| `matchText(text, patterns[])` | Regex múltiple |
| `stripHTML(html)` | Limpia etiquetas HTML |
| `parseNumber(str)` | "1.5k" → "1500" |

### Extractores

| Función | Descripción |
|---------|-------------|
| `extractLinks($, baseUrl)` | Todos los links |
| `extractImages($, baseUrl)` | Todas las imágenes |
| `extractScripts($, baseUrl)` | Scripts externos |
| `extractStyles($, baseUrl)` | Hojas de estilo |
| `extractEmails(text)` | Direcciones de email |
| `extractIFrames($, baseUrl)` | Iframes |
| `extractForms($)` | Formularios con campos |
| `extractJsonLd($)` | Datos JSON-LD estructurados |

### Anti-bloqueo

| Función/Clase | Descripción |
|---------------|-------------|
| `ProxyRotator` | Rotador de proxies (HTTP/SOCKS) |
| `Throttler` | Limitador de requests/minuto |
| `cacheBust(url)` | Evita caché del navegador |
| `isBlocked(html)` | Detecta bloqueo en respuesta |
| `inspectResponse(res)` | Inspecciona respuesta axios |

### Headers

| Función | Descripción |
|---------|-------------|
| `buildHeaders(opts?)` | Headers camuflados completos |
| `buildSecChUa()` | Sec-Ch-Ua aleatorio |
| `PROFILES` | 12 perfiles de dispositivo |
| `AGENTS` | User-Agents de cada perfil |
| `REFERERS` | 23 referers reales |
| `LANGUAGES` | 12 locales de idioma |

### Cookies

| Función | Descripción |
|---------|-------------|
| `cookiesFromFile(path)` | Lee cookies de archivo |
| `cookiesFromNetscape(path)` | Lee cookies formato Netscape |
| `cookiesFromBrowser(path)` | Alias de cookiesFromNetscape |
| `cookiesToHeader(cookies)` | Convierte a string header |
| `mergeCookies(...cookies)` | Fusiona múltiples fuentes |

### Utilidades

| Función | Descripción |
|---------|-------------|
| `rand(min, max)` | Entero aleatorio |
| `pick(arr)` | Elemento aleatorio |
| `shuffle(arr)` | Fisher-Yates shuffle |
| `shuffleObjectKeys(obj)` | Keys en orden aleatorio |
| `sleep(ms)` | Pausa en milisegundos |
| `randomDelay(min?, max?)` | Pausa aleatoria |
| `saveJSON(data, path)` | Guarda JSON a archivo |
| `loadJSON(path)` | Lee JSON de archivo |
| `log(msg, data?)` | Log a stderr con timestamp |

### Meta scraper

```js
const got = require('got-scraft');

const info = await got.scrapeMeta('https://ejemplo.com');
// { url, title, meta: {...}, og: {...} }
```

## TypeScript

El módulo incluye definiciones de tipos TypeScript (`types/index.d.ts`):

```typescript
import got, { ProxyRotator, Throttler, ClientOptions } from 'got-scraft';

const html: string = await got.fetch('https://ejemplo.com');
const rotator = new ProxyRotator(['127.0.0.1:8080']);
```

## Ejemplos

```bash
# Ejemplo básico
node examples/basic.js

# Ejemplo avanzado con anti-bloqueo
node examples/advanced.js
```

## Dependencias

| Paquete | Versión | Uso |
|---------|---------|-----|
| axios | ^1.18 | HTTP client |
| cheerio | ^1.2 | HTML parser |
| tough-cookie | ^5.1 | Cookie jar |
| axios-cookiejar-support | ^5.0 | Cookies en axios |
| https-proxy-agent | ^7.0 | Proxy HTTP/HTTPS |
| socks-proxy-agent | ^8.0 | Proxy SOCKS |
| iconv-lite | ^0.6 | Encoding conversion |
| chardet | ^2.1 | Detección de encoding |

## Licencia

MIT
