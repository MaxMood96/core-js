'use strict';
const { writeFile } = require('fs').promises;
const { cyan, green } = require('chalk');
const { minify } = require('terser');
const builder = require('core-js-builder');
const { banner } = require('core-js-builder/config');
const actual = require('core-js-compat/entries')['core-js/actual'];

const DENO = process.argv.includes('--deno');

const PATH = DENO ? './deno/corejs/' : './packages/core-js-bundle/';

function log(kind, name, code) {
  const size = (code.length / 1024).toFixed(2);
  // eslint-disable-next-line no-console -- output
  console.log(green(`${ kind }: ${ cyan(`${ PATH }${ name }.js`) }, size: ${ cyan(`${ size }KB`) }`));
}

async function bundle({ name, min, ...options }) {
  const source = await builder({ filename: `${ PATH }${ name }.js`, ...options });
  log('bundling', name, source);

  if (!min) return;

  const minified = `${ name }.min`;

  const { code, map } = await minify(source, {
    ecma: 5,
    keep_fnames: true,
    compress: {
      hoist_funs: false,
      hoist_vars: true,
      pure_getters: true,
      passes: 3,
      unsafe_proto: true,
      unsafe_undefined: true,
    },
    format: {
      max_line_len: 32000,
      preamble: banner,
      webkit: false,
    },
    sourceMap: {
      url: `${ minified }.map`,
    },
  });

  await writeFile(`${ PATH }${ minified }.js`, code);
  await writeFile(`${ PATH }${ minified }.map`, map);
  log('minification', minified, code);
}

if (DENO) {
  bundle({ name: 'index', min: false, targets: { deno: '1.0' } });
} else {
  bundle({ name: 'full', min: true });
  bundle({ name: 'actual', min: true, modules: actual });
}
