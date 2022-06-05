#!/usr/bin/env node

import esbuild from 'esbuild';
import { dirname as resolveDirname, isAbsolute, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { getEsbuildConfigBase } from '../../view/esbuildConfigBase';
import { builder } from '../builder/builder';
import { esDocsViewGlobalsAlias } from '../builder/handleMdx';

const argv = yargs(hideBin(process.argv)).argv as unknown as { inputDir: string; outputDir: string; _: string[] };
if (argv._.length > 1) {
  console.info(`Invalid cli input, expected: esdocs --inputDir [input directory path] --outDir [output directory path]`);
  process.exit(0);
}
const relativeInputDir = argv.inputDir ?? argv._[0] ?? '.';
const relativeOutputDir = argv.outputDir ?? argv._[0] ?? '/dist';
const inputDir = isAbsolute(relativeInputDir) ? relativeInputDir : resolvePath(process.cwd(), relativeInputDir);
const outputDir = isAbsolute(relativeOutputDir) ? relativeOutputDir : resolvePath(process.cwd(), relativeOutputDir);

(async () => {
  await builder(inputDir, outputDir);

  const dirname = import.meta.url ? resolveDirname(fileURLToPath(import.meta.url)) : __dirname;
  const config = getEsbuildConfigBase([resolvePath(dirname, '../../view/index.js'), resolvePath(dirname, '../../view/index.css')], resolvePath(outputDir, 'view'));
  await esbuild.build({ ...config, plugins: [...config.plugins!, esDocsViewGlobalsAlias] });
})();
