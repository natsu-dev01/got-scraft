#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PKG = require(path.join(ROOT, 'package.json'));
const SRC = path.join(ROOT, 'src', 'index.ts');

const REQUIRED_DIST = [
  'index.js', 'index.d.ts',
  'client.js', 'client.d.ts',
  'http.js', 'http.d.ts',
  'headers.js', 'headers.d.ts',
  'parser.js', 'parser.d.ts',
  'extract.js', 'extract.d.ts',
  'anti.js', 'anti.d.ts',
  'cookies.js', 'cookies.d.ts',
  'utils.js', 'utils.d.ts',
  'facebook.js', 'facebook.d.ts',
  'youtube.js', 'youtube.d.ts',
];

const FORBIDDEN_LEAKS = [
  path.join(ROOT, 'index.js'),
  path.join(ROOT, 'types', 'index.d.ts'),
];

let exitCode = 0;

function fail(msg) {
  console.error('  ✘', msg);
  exitCode = 1;
}

function ok(msg) {
  console.log('  ✓', msg);
}

console.log(`\n🔒 Verifying got-scraft@${PKG.version}\n`);

// 1. Check dist/ exists
if (!fs.existsSync(path.join(ROOT, 'dist'))) {
  fail('dist/ directory not found — run npm run build first');
  process.exit(1);
}

// 2. Check required files
for (const file of REQUIRED_DIST) {
  const fp = path.join(ROOT, 'dist', file);
  if (!fs.existsSync(fp)) {
    fail(`Missing required file: dist/${file}`);
  } else {
    ok(`dist/${file} exists`);
  }
}

// 3. SHA256 integrity check
const DIST_MAIN = path.join(ROOT, 'dist', 'index.js');
const distHash = crypto.createHash('sha256').update(fs.readFileSync(DIST_MAIN)).digest('hex');
const INTEGRITY_FILE = path.join(ROOT, 'dist', '.integrity');

if (fs.existsSync(INTEGRITY_FILE)) {
  const expectedHash = fs.readFileSync(INTEGRITY_FILE, 'utf-8').trim();
  if (distHash === expectedHash) {
    ok(`SHA256 integrity matches: ${distHash}`);
  } else {
    fail(`SHA256 mismatch!
  expected: ${expectedHash}
  actual:   ${distHash}
  Rebuild with 'npm run build'`);
  }
} else {
  fail('dist/.integrity not found — run npm run build first');
}

// 4. Check no forbidden files leaked
for (const fp of FORBIDDEN_LEAKS) {
  if (fs.existsSync(fp)) {
    fail(`Old file still present: ${path.relative(ROOT, fp)}`);
  } else {
    ok(`No leak: ${path.relative(ROOT, fp)}`);
  }
}

// 5. Check package.json references
const mainMatch = PKG.main === 'dist/index.js';
const typesMatch = PKG.types === 'dist/index.d.ts';
if (mainMatch) ok('package.json main points to dist/index.js');
else fail('package.json main should be dist/index.js');
if (typesMatch) ok('package.json types points to dist/index.d.ts');
else fail('package.json types should be dist/index.d.ts');

// 6. Check exports consistency
const exportsOk = PKG.exports?.['.']?.require === './dist/index.js'
  && PKG.exports?.['.']?.import === './src/index.mjs';
if (exportsOk) ok('package.json exports are consistent');
else fail('package.json exports inconsistent');

console.log(exitCode === 0 ? '\n✅ All checks passed\n' : '\n❌ Some checks failed\n');
process.exit(exitCode);
