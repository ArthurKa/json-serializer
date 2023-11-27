// @ts-check
'use strict';

module.exports = ((/** @type {import('lint-staged').Config} */ e) => e)(files => {
  /** @type {string[]} */
  const commands = [];

  const pkgsFileObj = (
    files
      .filter(e => e.match(/\.[tj]sx?$/))
      .reduce((acc, cur) => {
        const match = cur.match(/^(packages\/.+?)\/(.+)/);

        const key = match?.[1] ?? '';

        if(!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(cur);

        return acc;
      }, /** @type {Record<string, string[]>} */({}))
  );

  commands.push(...Object.entries(pkgsFileObj).map(([pkg, files]) => (
    `${pkg ? `npx --prefix ${pkg} ` : ''}eslint --max-warnings=0 ${files.join(' ')}`
  )));

  if(files.some(e => e.match(/(\btsconfig.*\.json|\.tsx?)$/))) {
    commands.push('npm run ts:noWatch');
  }

  return commands;
});
