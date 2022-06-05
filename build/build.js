import { build as esbuild } from 'esbuild';
import glob from 'fast-glob';
import fs from 'fs-extra';
import { resolve as resolvePath } from 'path';

await fs.remove('dist/build');
await esbuild({
  bundle: true,
  sourcemap: false,
  entryPoints: ['src/core/cli/cli.ts', 'src/view/index.tsx', 'src/view/global/global.js'],
  platform: 'node',
  outdir: resolvePath('dist/build'),
  format: 'cjs',
  logLevel: 'warning',
  target: 'esnext',
  external: ['esbuild', '@setup/*', 'react'],
}).catch(() => process.exit(1));
await fs.writeJSON('dist/build/package.json', {});
