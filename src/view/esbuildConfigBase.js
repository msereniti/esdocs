// @ts-check
import { resolve as resolvePath } from 'path';

/** @type {(entryPoints: string[], outdir: string) => import("esbuild").BuildOptions} */
export const getEsbuildConfigBase = (entryPoints, outdir) => ({
  entryPoints,
  outdir,
  bundle: true,
  sourcemap: true,
  logLevel: 'warning',
  plugins: [
    {
      name: 'esdocs-setup-resolver',
      setup: (build) =>
        build.onResolve({ filter: /^@setup\// }, (args) => {
          const realPath = resolvePath(
            outdir,
            '..',
            args.path.substring('@'.length)
          );

          return { path: realPath };
        }),
    },
  ],
});
