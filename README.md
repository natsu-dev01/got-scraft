# got-scraft

Módulo de scraping con **axios** + **cheerio**.

## Instalación

```bash
git clone https://github.com/natsu-dev01/got-scraft.git
cd got-scraft
npm install
```

## API

### Peticiones HTTP

```js
const { fetch, fetchWithRetry, createClient } = require('./index');

// GET simple
const html = await fetch('https://ejemplo.com');

// Con reintentos automáticos
const html = await fetchWithRetry('https://ejemplo.com', { retries: 3 });

// Cliente reutilizable con proxy
const client = createClient({ proxy: { host: '127.0.0.1', port: 8080 } });
const html = await fetch('https://ejemplo.com', { client });
```

### Parseo HTML

```js
const { load, getMeta, getAllMeta, getText, getLines, matchText } = require('./index');

const $ = load(html);

getMeta($, 'og:title');         // Meta tag por propiedad
getAllMeta($);                   // Todas las meta tags
getText($);                      // Texto plano del body
getLines($);                     // Líneas de texto

matchText(text, [/patron1/, /patron2/]);  // Primer match
```

### Utilidades

```js
const { parseNumber, rand, sleep, pick, shuffle, saveJSON, loadJSON } = require('./index');

parseNumber('1.5k');    // "1500"
parseNumber('2M');      // "2000000"
rand(1, 10);            // Número aleatorio
sleep(1000);            // Delay 1s
pick(['a', 'b']);       // Elemento aleatorio
shuffle([1, 2, 3]);     // Array mezclado
saveJSON(data, 'file.json');
loadJSON('file.json');
```

## Ejemplo rápido

```js
const { fetch, load, getMeta, getAllMeta } = require('./index');

async function main() {
  const html = await fetch('https://ejemplo.com');
  const $ = load(html);

  console.log('Meta tags:', getAllMeta($));
  console.log('OG Title:', getMeta($, 'og:title'));
}

main();
```

## Dependencias

- [axios](https://github.com/axios/axios) — HTTP client
- [cheerio](https://github.com/cheeriojs/cheerio) — HTML parser
