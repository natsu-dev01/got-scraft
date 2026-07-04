# got-scraft

Módulo de scraping con **axios** + **cheerio**. Anti-bloqueo para cualquier web.

```bash
npm install https://github.com/natsu-dev01/got-scraft.git
```

```js
const { fetch, load, getOG } = require('got-scraft');
const html = await fetch('https://ejemplo.com');
const $ = load(html);
console.log(getOG($));
```

## Anti-bloqueo

### Proxy rotatorio

```js
const { ProxyRotator, fetchWithRetry } = require('got-scraft');

const rotator = new ProxyRotator()
  .loadFromFile('./proxies.txt')
  .add('192.168.1.1:8080');

const html = await fetchWithRetry('https://ejemplo.com', {
  proxyRotator: rotator,      // cambia proxy en cada error
  rotateOnError: true,
  retries: 5,
});
```

**proxies.txt:**
```
127.0.0.1:8080
192.168.1.1:3128
10.0.0.1:8888
```

### Rate limiting

```js
const { Throttler, fetch } = require('got-scraft');

const throttler = new Throttler(20); // 20 requests/minuto

const html = await fetch('https://ejemplo.com', { throttler });
```

### Cache busting

```js
const { fetch, cacheBust } = require('got-scraft');

// Añade ?_=timestamp a cada URL
const html = await fetch('https://ejemplo.com', { cacheBust: true });

// Manual
const url = cacheBust('https://ejemplo.com');
```

### Headers camuflados

```js
const { createClient, buildHeaders } = require('got-scraft');

const client = createClient({
  randomizeHeaders: true,    // orden aleatorio
  profile: null,             // perfil completo aleatorio
  cacheBust: true,           // X-Request-Id único
});

// Headers sueltos
const headers = buildHeaders({ randomizeHeaders: true });
```

### Sesión completa

```js
const { createSession } = require('got-scraft');

const session = createSession({
  minGap: 3000,              // 3s entre requests
  maxRPM: 15,                // max 15 por minuto
  cookieJar: true,            // cookies persistentes
  cacheBust: true,
});

const a = await session.get('https://ejemplo.com/a');
const b = await session.get('https://ejemplo.com/b');
```

### Cookie tools

```js
const { cookiesFromFile, cookiesFromNetscape, mergeCookies } = require('got-scraft');

const c1 = cookiesFromFile('./cookies.txt');        // "key=val; key2=val2"
const c2 = cookiesFromNetscape('./cookies_netscape.txt'); // formato Netscape
const merged = mergeCookies(c1, c2);
```

### Detectar bloqueo

```js
const { isBlocked, inspectResponse } = require('got-scraft');

const html = await fetch('https://ejemplo.com');
if (isBlocked(html)) {
  console.log('Bloqueado!');
}

// o inspeccionar la respuesta completa
const res = await axios.get('https://ejemplo.com');
console.log(inspectResponse(res));
```

## API general

| Función | Descripción |
|---------|-------------|
| `fetch(url, opts)` | GET request |
| `fetchWithRetry(url, opts)` | GET con reintentos + backoff |
| `post(url, body, opts)` | POST request |
| `createClient(opts)` | Cliente axios reusable |
| `createSession(opts)` | Sesión con rate limit + cookies |
| `load(html)` | Carga HTML en cheerio |
| `getMeta($, prop)` | Meta tag por propiedad |
| `getAllMeta($)` | Todas las meta tags |
| `getOG($)` | Solo og: tags |
| `getText($)` | Texto plano del body |
| `getLines($)` | Líneas de texto |
| `matchText(text, patterns)` | Regex multiple |
| `stripHTML(html)` | Limpia HTML |
| `extractLinks($, base)` | Todos los links |
| `extractImages($, base)` | Todas las imágenes |
| `extractScripts($, base)` | Scripts externos |
| `extractEmails(text)` | Emails encontrados |
| `parseNumber(str)` | "1.5k" → "1500" |
| `saveJSON(data, path)` | Guardar JSON |
| `loadJSON(path)` | Leer JSON |
| `log(msg, data?)` | Log a stderr |
| `rand(min, max)` | Número aleatorio |
| `randomDelay(min, max)` | Pausa aleatoria |
| `sleep(ms)` | Pausa en ms |
| `pick(arr)` | Elemento aleatorio |
| `shuffle(arr)` | Array mezclado |
| `shuffleObjectKeys(obj)` | Keys mezcladas |
| `cacheBust(url)` | Añade timestamp a URL |
| `buildHeaders(opts)` | Headers anti-detección |
| `buildSecChUa()` | Sec-Ch-Ua dinámico |
| `isBlocked(html)` | Detecta bloqueo |
| `inspectResponse(res)` | Inspecciona respuesta axios |
| `cookiesFromFile(path)` | Lee cookies de archivo |
| `cookiesFromNetscape(path)` | Lee cookies formato Netscape |
| `mergeCookies(...cookies)` | Fusiona cookies |
| `scrapeMeta(url, opts)` | Scrapea meta tags directo |

### Constantes

| Constante | Descripción |
|-----------|-------------|
| `PROFILES` | 12 perfiles de dispositivo (Win/Mac/Linux/Mobile) |
| `AGENTS` | User-Agents de cada perfil |
| `REFERERS` | 20 referers reales |
| `LANGUAGES` | 10 locales de idioma |
