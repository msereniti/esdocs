/* eslint-disable no-console */
import esbuild from 'esbuild';
import { resolve as resolvePath } from 'path';
import colors from 'picocolors';

import { getEsbuildConfigBase } from '../src/view/esbuildConfigBase.js';

const port = 3000;

esbuild
  .serve(
    {
      servedir: resolvePath('./dist/demo'),
      port,
      onRequest: ({ method, path, status, timeInMS }) => {
        const before = `[${method}] `;
        let main = path;
        const after = ` in ${timeInMS}ms`;

        if (status !== 200) {
          main += `:${status}`;
        }
        const message = colors.gray(before) + (status === 200 ? colors.green(main) : colors.red(main)) + colors.gray(after);

        console.info(message);
      },
    },
    getEsbuildConfigBase([resolvePath('./src/view/index.jsx')], resolvePath('./dist/demo/view'))
  )
  .then(() => console.info(`Started on http://localhost:${port}`));
