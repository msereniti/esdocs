import { BuildOptions } from 'esbuild';

declare const getEsbuildConfigBase: (
  entryPoints: string[],
  outdir: string
) => BuildOptions;
