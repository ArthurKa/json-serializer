// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nvmrc = fs.readFileSync(path.resolve('.nvmrc'), 'utf-8').trim();

const { node } = process.versions;
if(node !== nvmrc) {
  throw new Error(`You must use Node.js v${nvmrc} for this project (${node} used)`);
}

const npmVersion = execSync('npm -v').toString().trim();
if(Number(npmVersion.split('.')[0]) !== 9) {
  throw new Error(`You must use NPM v9.x.x (${npmVersion} used)`);
}

/** @type {any} */
const vscodeSettings = JSON.parse(fs.readFileSync(path.resolve('./.vscode/settings.json'), 'utf-8'));
if(!('typescript.tsdk' in vscodeSettings)) {
  throw new Error("Don't forget to pick TypeScript version from node_modules in VS Code");
}
