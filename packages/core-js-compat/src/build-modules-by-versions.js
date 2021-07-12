'use strict';
const { writeFile } = require('fs/promises');
const { resolve } = require('path');
const { green } = require('chalk');
const modules = require('../modules');
const modulesByVersions = require('./modules-by-versions');

const defaults = new Set(modules);

for (const version of Object.values(modulesByVersions)) {
  for (const module of version) defaults.delete(module);
}

(async () => {
  await writeFile(resolve(__dirname, '../data/modules-by-versions.json'), JSON.stringify({
    '4.0': [...defaults],
    ...modulesByVersions,
  }, null, '  '));
  // eslint-disable-next-line no-console -- output
  console.log(green('modules-by-versions data rebuilt'));
})();
