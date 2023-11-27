// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');

const searchExcludeFilesOrFolders = [
  'node_modules',
  'build',
  'public',
  'dist',
  '.next',
];

/**
  @type {
    Array<[
      RegExp,
      ((e: RegExpExecArray) => any[]) | any[],
      (string | Parameters<Parameters<string['replace']>[0][typeof Symbol.replace]>[1])?,
      RegExp?,
    ]>
  }
*/
const matchReplacePatterns = [
  [/\(\s+\)/, ['Probably some no needed spaces in parentheses?'], '()'],
  [/\{\s+\}/, ['Probably some no needed spaces in curly braces?'], '{}'],
  [/ +$/m, ['Probably some no needed trailing spaces?'], ''],
  [/\[\s+\]/, ['Probably some no needed spaces in square brackets?'], '[]'],
  [/\}{\n/, ['Probably forgot space between "}{"?'], '} {\n'],
  [/\){\n/, ['Probably forgot space between "){"?'], ') {\n'],
  [/(\w)({\n)/, ['Probably forgot space before "{"?'], '$1 $2'],
  [/#[a-f\d]*(?=[A-F]).+?\b/, ['Probably inappropriate uppercase letter(s) in color hash?'], e => e.toLowerCase()],
  [/#([a-f\d])\1([a-f\d])\2([a-f\d])\3\b/, ['Probably some shortable color hash?'], e => (
    e
      .split('')
      .filter((_, i) => i % 2 === 0)
      .join('')
  )],
  [/((^| )\/\/)(?![ /])/m, ['Probably need the space after "//"?'], '$1 '],
  [/(`\n)\n+|\n+?(\n`)/, ['Probably some extra blank line(s) next to backtick?'], (...match) => `${match[1] ?? ''}${match[2] ?? ''}`],
  [/[\n ]+;\n/, ['Probably some extra space(s) before semicolon?'], ';\n'],
  [/^(.*?)>(\{[^}]*\}\n)/m, ['Probably wrong code formatting?'], (...match) => (
    `${match[1]}>\n${Array.from({ length: match[1].length + 2 }, () => ' ').join('')}${match[2]}`
  )],
  [/([Gg])rey/, ['Probably spell "gray", not with "e"?'], '$1ray'],
  [/import React from 'react';\n/, ['Probably no need to import React?'], ''],
  [/(import )React, (\{)/, ['Probably no need to import React?'], '$1$2'],
  [/([^.]\.{3}) ({)/, ['Probably some no needed spaces before curly brace?'], '$1$2'],
  [/(styled-components)(')/, ['Probably wrong import from styled-components?'], '$1/native$2'],
  // eslint-disable-next-line no-useless-escape
  [/\)\s</, ['Probably no needed space in ")\ <"?'], ')<'],
];

/** @type {Set<string>} */
const uniqueErrorHashes = new Set();
const isBadErrorHash = (/** @type {string} */ hash) => Boolean(hash.match(/[a-z]{4}/));
const getErrorHash = () => {
  const getHash = () => Math.random().toString(36).slice(2, 8);
  let hash;
  do {
    hash = getHash();
  } while(hash.length !== 6 || isBadErrorHash(hash));

  return hash;
};
/** @type {typeof matchReplacePatterns[number]} */
const uniqueErrorHashMatchReplacePattern = [
  /('(?:This should never happen|Something went wrong)\. )([a-z0-9]{6})(')/,
  match => [`Probably bad unique error hash "${match[2]}"?`],
  (...match) => `${match[1]}${getErrorHash()}${match[3]}`,
];

const fixFlag = '--fix';
const fixMode = process.argv.indexOf(fixFlag) !== -1;
let foundSomeErrors = false;

function parseFile(/** @type {string} */ file) {
  if(!file.match(/\.[jt]sx?$/i)) {
    return;
  }

  const originalText = fs.readFileSync(file).toString('utf-8');
  let text = originalText;

  for(const [re, errorMessage, replaceOn, fileNameMatchRE] of matchReplacePatterns) {
    if(fileNameMatchRE && !file.match(fileNameMatchRE)) {
      continue;
    }

    let match;
    const regExp = new RegExp(re, [...new Set(`${re.flags}g`)].join(''));

    // eslint-disable-next-line no-cond-assign
    while((match = regExp.exec(text)) && typeof match[0] !== 'undefined') {
      if(fixMode && typeof replaceOn !== 'undefined') {
        const re = new RegExp(regExp, regExp.flags.replace('g', ''));

        if(typeof replaceOn === 'string') {
          text = text.replace(re, replaceOn);
        } else {
          text = text.replace(re, replaceOn);
        }

        regExp.lastIndex -= match[0].length - replaceOn.length;
      } else {
        const line = text.slice(0, match.index).split('\n').length;
        console.info(`${path.relative('.', file)}:${line}`);
        if(typeof errorMessage === 'function') {
          console.info(...errorMessage(match));
        } else {
          console.info(...errorMessage);
        }

        foundSomeErrors = true;
      }
    }
  }

  {
    const [re, errorMessage, replaceOn] = uniqueErrorHashMatchReplacePattern;

    /** @type {RegExpExecArray | null} */
    let match;
    const regExp = new RegExp(re, [...new Set(`${re.flags}g`)].join(''));

    // eslint-disable-next-line no-cond-assign
    while((match = regExp.exec(text)) && typeof match[0] !== 'undefined') {
      const hash = match[2];
      if(hash === void 0) {
        continue;
      }

      if(!isBadErrorHash(hash) && !uniqueErrorHashes.has(hash)) {
        uniqueErrorHashes.add(hash);
        continue;
      }

      if(fixMode && typeof replaceOn !== 'undefined') {
        const re = new RegExp(regExp, regExp.flags.replace('g', ''));

        let replacedString = '';
        if(typeof replaceOn === 'string') {
          replacedString = replaceOn;
          text = text.replace(re, replaceOn);
        } else {
          const start = text.slice(0, match.index);
          const end = text.slice(match.index).replace(re, (...params) => {
            replacedString = replaceOn(...params);

            return replacedString;
          });

          text = `${start}${end}`;
        }

        regExp.lastIndex -= match[0].length - replacedString.length;
      } else {
        const line = text.slice(0, match.index).split('\n').length;
        console.info(`${path.relative('.', file)}:${line}`);
        if(typeof errorMessage === 'function') {
          console.info(...errorMessage(match));
        } else {
          console.info(...errorMessage);
        }

        foundSomeErrors = true;
      }
    }
  }

  if(originalText !== text) {
    fs.writeFileSync(file, text);
  }
}

function parseDirOrFile(/** @type {string} */ folderOrFile) {
  if(searchExcludeFilesOrFolders.includes(path.parse(folderOrFile).base)) {
    return;
  }

  if(!fs.statSync(folderOrFile).isDirectory()) {
    parseFile(folderOrFile);
  } else {
    for(const subfolderOrFile of fs.readdirSync(folderOrFile)) {
      parseDirOrFile(path.join(folderOrFile, subfolderOrFile));
    }
  }
}

const argv = process.argv.slice(2).filter(e => e !== fixFlag);
if(!argv.length) {
  argv.push('');
}

for(const folderOrFile of argv) {
  parseDirOrFile(path.resolve(folderOrFile ?? ''));
}

if(foundSomeErrors) {
  console.info();
  console.error('Some errors were found. Try `npm run repo-fix` to fix them.');
  console.info();

  process.exit(1);
}
