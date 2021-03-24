'use strict';
const builder = require('@core-js/builder');
const actual = require('@core-js/compat/entries')['core-js/actual'];

const DENO = process.argv.includes('--deno');

if (DENO) {
  builder({ filename: './deno/corejs/full.js', targets: { deno: '1.0' }, minify: false, summary: { size: true } });
} else {
  const PATH = './packages/core-js-bundle/';
  builder({ filename: `${ PATH }full.js`, minify: false, summary: { size: true } });
  builder({ filename: `${ PATH }full.min.js`, summary: { size: true } });
  builder({ filename: `${ PATH }actual.js`, modules: actual, minify: false, summary: { size: true } });
  builder({ filename: `${ PATH }actual.min.js`, modules: actual, summary: { size: true } });
}
