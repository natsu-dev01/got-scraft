const fs = require('fs');
const path = require('path');

function cookiesFromFile(filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf8').trim();
  } catch { return ''; }
}

function cookiesFromNetscape(filePath) {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    const cookies = [];
    for (const line of content.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;
      const parts = line.trim().split('\t');
      if (parts.length >= 7) {
        cookies.push(`${parts[5]}=${parts[6]}`);
      }
    }
    return cookies.join('; ');
  } catch { return ''; }
}

function cookiesFromBrowser(filePath) {
  return cookiesFromNetscape(filePath);
}

function cookiesToHeader(cookies) {
  if (Array.isArray(cookies)) return cookies.join('; ');
  return cookies;
}

function mergeCookies(...cookies) {
  const map = {};
  for (const c of cookies) {
    if (!c) continue;
    c.split(';').forEach(pair => {
      const [k, ...v] = pair.trim().split('=');
      if (k) map[k.trim()] = v.join('=');
    });
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

module.exports = { cookiesFromFile, cookiesFromNetscape, cookiesFromBrowser, cookiesToHeader, mergeCookies };
