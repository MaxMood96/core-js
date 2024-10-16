'use strict';
const { promisify } = require('util');
const fs = require('fs');
// TODO: replace by `fs.promises` after dropping NodeJS < 10 support
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);
const { dirname, join } = require('path');
const tmpdir = require('os').tmpdir();
// TODO: replace by `mkdir` with `recursive: true` after dropping NodeJS < 10.12 support
const mkdirp = promisify(require('mkdirp'));
const webpack = promisify(require('webpack'));
const compat = require('core-js-compat/compat');
const modulesList = require('core-js-compat/modules');
const { filterOutStabilizedProposals } = require('core-js-compat/helpers');
const { banner } = require('./config');

function normalizeSummary(unit = {}) {
  let size, modules;
  if (typeof unit != 'object') {
    size = modules = !!unit;
  } else {
    size = !!unit.size;
    modules = !!unit.modules;
  } return { size, modules };
}

module.exports = async function ({
  blacklist, // TODO: Remove from `core-js@4`
  exclude = [],
  modules = modulesList.slice(),
  targets,
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
  filter('delete', blacklist || exclude);

  // eslint-disable-next-line sonarjs/no-empty-collection -- false positive
  modules = filterOutStabilizedProposals(modulesList.filter(it => set.has(it)));

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
      node: {
        global: false,
        process: false,
        setImmediate: false,
      },
      entry: modules.map(it => require.resolve(`core-js/modules/${ it }`)),
      output: {
        filename: tempFileName,
        hashFunction: 'md5',
        path: tmpdir,
      },
    });

    const file = await readFile(tempFile);

    await unlink(tempFile);

    code = `!function (undefined) { 'use strict'; ${
      // compress `__webpack_require__` with `keep_fnames` option
      String(file).replace(/function __webpack_require__/, 'var __webpack_require__ = function ')
    } }();`;
  }

  if (summary.comment.size) script += `/*\n * size: ${ (code.length / 1024).toFixed(2) }KB w/o comments\n */`;
  if (summary.comment.modules) script += `/*\n * modules:\n${ modules.map(it => ` * ${ it }\n`).join('') } */`;
  if (code) script += `\n${ code }`;

  if (summary.console.size) {
    // eslint-disable-next-line no-console -- output
    console.log(`\u001B[32mbundling \u001B[36m${ TITLE }\u001B[32m, size: \u001B[36m${
      (script.length / 1024).toFixed(2)
    }KB\u001B[0m`);
  }

  if (summary.console.modules) {
    // eslint-disable-next-line no-console -- output
    console.log(`\u001B[32mbundling \u001B[36m${ TITLE }\u001B[32m, modules:\u001B[0m`);
    // eslint-disable-next-line no-console -- output
    console.log(JSON.stringify(modulesWithTargets || modules, null, '  '));
  }

  if (typeof filename != 'undefined') {
    await mkdirp(dirname(filename));
    await writeFile(filename, script);
  }

  return script;
};
