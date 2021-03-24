'use strict';
const { mkdir, readFile, unlink, writeFile } = require('fs').promises;
const { dirname, join } = require('path');
const { promisify } = require('util');
const tmpdir = require('os').tmpdir();
const webpack = promisify(require('webpack'));
const { minify: terser } = require('terser');
const compat = require('@core-js/compat/compat');
const modulesList = require('@core-js/compat/modules');
const { banner } = require('./config');

function normalizeSummary(unit = {}) {
  let size, modules;
  if (typeof unit !== 'object') {
    size = modules = !!unit;
  } else {
    size = !!unit.size;
    modules = !!unit.modules;
  } return { size, modules };
}

module.exports = async function ({
  exclude = [],
  modules = modulesList.slice(),
  targets,
  minify = true,
  filename,
  summary = {},
} = {}) {
  summary = { comment: normalizeSummary(summary.comment), console: normalizeSummary(summary.console) };

  const TITLE = filename != null ? filename : '`core-js`';
  const set = new Set();
  let script = banner;
  let code = '';
  let modulesWithTargets;

  function filter(method, list) {
    for (const ns of list) {
      for (const name of modulesList) {
        if (name === ns || name.startsWith(`${ ns }.`)) {
          // eslint-disable-next-line sonarjs/no-empty-collection -- false positive
          set[method](name);
        }
      }
    }
  }

  filter('add', modules);
  filter('delete', exclude);

  // eslint-disable-next-line sonarjs/no-empty-collection -- false positive
  modules = modulesList.filter(it => set.has(it));

  if (targets) {
    const compatResult = compat({ targets, filter: modules });
    modules = compatResult.list;
    modulesWithTargets = compatResult.targets;
  }

  if (modules.length) {
    const tempFileName = `core-js-${ Math.random().toString(36).slice(2) }.js`;
    const tempFile = join(tmpdir, tempFileName);

    await webpack({
      mode: 'none',
      node: false,
      target: ['node', 'es5'],
      entry: modules.map(it => require.resolve(`core-js/modules/${ it }`)),
      output: {
        path: tmpdir,
        filename: tempFileName,
      },
    });

    const file = await readFile(tempFile);

    await unlink(tempFile);

    code = `!function (undefined) { 'use strict'; ${
      // compress `__webpack_require__` with `keep_fnames` option
      String(file).replace(/function __webpack_require__/, 'var __webpack_require__ = function ')
    } }();`;
  }

  if (minify) {
    const { code } = await terser(script, {
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
    });

    script = code;
  }

  if (typeof filename != 'undefined') {
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, script);
  }

  return script;
};
