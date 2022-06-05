import { build as esbuild } from 'esbuild';
import { createRequire } from 'module';

import { getEsbuildConfigBase } from '../../view/esbuildConfigBase';
const resolve = import.meta.url ? createRequire(import.meta.url).resolve : require.resolve;
const viewRuntimeEntrypoint =  resolve('../../view/index.js');

export const buildView = async (destinationPath: string) => {
  await esbuild(getEsbuildConfigBase([viewRuntimeEntrypoint], destinationPath));
};
