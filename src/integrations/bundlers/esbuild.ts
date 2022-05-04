import { build as esbuild } from 'esbuild';
import { basename as resolvePathBasename } from 'path';

import { EsDocsBundlerIntegration } from './bunders';

export const esbuildIntegration: EsDocsBundlerIntegration = async ({ entryPoints, external, outputDir }) => {
  const {
    metafile: { outputs },
  } = await esbuild({
    external,
    entryPoints,
    bundle: true,
    outdir: outputDir,
    treeShaking: false,
    format: 'cjs',
    metafile: true,
  });

  const chunkIdByEntryPointBasename: { [entryPointBasename: string]: string } = {};

  for (const chunkId in entryPoints) {
    chunkIdByEntryPointBasename[resolvePathBasename(entryPoints[chunkId])] = chunkId;
  }

  return Object.entries(outputs).map(([chunkFilePath, { entryPoint }]) => ({
    chunkFilePath,
    id: chunkIdByEntryPointBasename[resolvePathBasename(entryPoint!)],
    hasSourceMaps: true,
  }));
};
