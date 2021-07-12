'use strict';
const { readFile, writeFile } = require('fs/promises');
const { dirname, resolve } = require('path');
const { promisify } = require('util');
const { green } = require('chalk');
const konan = require('konan');
const glob = promisify(require('glob'));
const { intersection, sortObjectByKey } = require('../helpers');
const modules = require('../modules');

async function getModulesForEntryPoint(entry) {
  const match = entry.match(/[/\\]modules[/\\]([^/\\]+)$/);
  if (match) return [match[1]];
  const name = require.resolve(entry);
  const result = [];
  const dir = dirname(name);
  const file = await readFile(name);
  const dependencies = konan(String(file)).strings;
  for (const dependency of dependencies) {
    const relative = resolve(dir, dependency);
    result.push(...await getModulesForEntryPoint(relative));
  }
  return intersection(result, modules);
}

(async () => {
  const entriesMap = [];
  const entriesList = ['packages/core-js/index.js', ...(await Promise.all([
    glob('packages/core-js/actual/**/*.js'),
    glob('packages/core-js/es/**/*.js'),
    glob('packages/core-js/full/**/*.js'),
    glob('packages/core-js/modules/*.js'),
    glob('packages/core-js/proposals/**/*.js'),
    glob('packages/core-js/stable/**/*.js'),
    glob('packages/core-js/stage/**/*.js'),
    glob('packages/core-js/web/**/*.js'),
  ])).flat()];

  for (const file of entriesList) {
    // TODO: store entries without the package name in `core-js@4`
    const entry = file.replace(/^packages\/(core-js.+)\.js$/, '$1').replace(/^(.+)\/index$/, '$1');
    entriesMap[entry] = await getModulesForEntryPoint(resolve(__dirname, `../../${ entry }`));
  }

  await writeFile(resolve(__dirname, '../data/entries.json'), JSON.stringify(sortObjectByKey(entriesMap), null, '  '));

  // eslint-disable-next-line no-console -- output
  console.log(green('entries data rebuilt'));
})();
