// @ts-check
import { readFile } from 'fs/promises';
import { resolve as resolvePath } from 'path';

/** @type {(entryPoints: string[], outdir: string) => import("esbuild").BuildOptions} */
export const getEsbuildConfigBase = (entryPoints, outdir) => ({
  entryPoints,
  outdir,
  bundle: true,
  sourcemap: true,
  logLevel: 'warning',
  external: ['source-map'],
  plugins: [
    {
      name: 'esdocs-setup-resolver',
      setup: (build) =>
        build.onResolve({ filter: /^@setup\// }, (args) => {
          const realPath = resolvePath(outdir, '..', args.path.substring('@'.length));

          return { path: realPath };
        }),
    },
    {
      name: 'wasm-plugin',
      setup: (build) => {
        build.onResolve({ filter: /\.wasm$/ }, ({ path, namespace }) => {
          if (namespace === 'wasm-loader') {
            return {
              path,
              namespace: 'wasm-binary',
            };
          }

          // TBD: unversal resolve node_modules

          const nodeModulesPath = resolvePath('node_modules');

          return {
            path: resolvePath(nodeModulesPath, path),
            namespace: 'wasm-loader',
          };
        });

        build.onLoad({ filter: /.*/, namespace: 'wasm-loader' }, async (args) => ({
          contents: `
              import wasm from ${JSON.stringify(args.path)}
              export default (imports = {}) =>
                WebAssembly.instantiate(wasm, imports).then(
                  result => result.instance.exports
                );
            `,
        }));

        build.onLoad({ filter: /.*/, namespace: 'wasm-binary' }, async ({ path }) => ({
          contents: await readFile(path),
          loader: 'binary',
        }));
      },
    },
  ],
});
