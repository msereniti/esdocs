import { build as esbuild } from 'esbuild';

import { resolvePath } from '../../core/utils/fs';
import { EsDocsBundlerIntegration } from './bunders';

export const esbuildIntegration: EsDocsBundlerIntegration = async ({
  entryPoints,
  external,
  outputDir,
}) => {
  await esbuild({
    external,
    entryPoints,
    bundle: true,
    minify: false,
    outdir: outputDir,
    treeShaking: false,
    format: 'cjs',
  });

  return Object.entries(entryPoints).map(([id]) => ({
    id,
    chunkFilePath: resolvePath(outputDir, id + '.js'),
  }));
};
