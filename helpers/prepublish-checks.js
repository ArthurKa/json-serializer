// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

const {
  compilerOptions: {
    outDir,
  },
} = /** @type {import('../tsconfig.json')} */ (JSON5.parse(fs.readFileSync(path.resolve('tsconfig.json'), 'utf-8')));

const mapFiles = fs.readdirSync(path.resolve(outDir)).filter(e => e.endsWith('.map'));
if(mapFiles.length) {
  throw new Error(`There should not be \`*.map\` files in \`${outDir}\` folder. Run \`npm run build\``);
}
