import { build as esbuild } from 'esbuild';
import { resolve as resolvePath } from 'path';
import recursiveReadDir from 'recursive-readdir';

esbuild({
  entryPoints: await recursiveReadDir(resolvePath('src')),
  bundle: false,
  sourcemap: true,
  platform: 'node',
  outdir: resolvePath('dist/dev'),
  format: 'esm',
  logLevel: 'warning',
  plugins: [],
  target: 'esnext',
}).catch(() => process.exit(1));
