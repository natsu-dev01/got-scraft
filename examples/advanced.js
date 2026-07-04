const got = require('got-scraft');

async function scrapeWithAntiBlock() {
  const session = got.createSession({
    minGap: 3000,
    maxRPM: 15,
    cacheBust: true,
    cookieJar: true,
    randomizeHeaders: true,
  });

  const html = await session.get('https://httpbin.org/html');
  const $ = got.load(html);

  const result = {
    url: 'https://httpbin.org/html',
    title: $('title').text(),
    meta: got.getAllMeta($),
    links: got.extractLinks($, 'https://httpbin.org'),
    images: got.extractImages($, 'https://httpbin.org'),
  };

  got.saveJSON(result, `./output-${Date.now()}.json`);
  console.log('Done:', result.title);
}

scrapeWithAntiBlock().catch(console.error);
