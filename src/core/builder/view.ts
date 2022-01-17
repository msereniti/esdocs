import { build as esbuild } from 'esbuild';
import { createRequire } from 'module';

import { getEsbuildConfigBase } from '../../view/esbuildConfigBase';
const require = createRequire(import.meta.url);
const viewRuntimeEntrypoint = require.resolve('../../view/index.js');

export const buildView = async (destinationPath: string) => {
  await esbuild(getEsbuildConfigBase([viewRuntimeEntrypoint], destinationPath));
};
