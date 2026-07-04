const got = require('got-scraft');

async function main() {
  const html = await got.fetch('https://httpbin.org/html');
  const $ = got.load(html);

  console.log('Title:', $('title').text());
  console.log('Meta:', got.getAllMeta($));
  console.log('OG:', got.getOG($));
  console.log('Links:', got.extractLinks($, 'https://httpbin.org').length);
}

main().catch(console.error);
