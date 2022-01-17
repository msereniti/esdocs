import { readdir, stat } from 'fs/promises';
import { sep } from 'path';

import { resolvePath } from './fs';

export const findNodeModules = async (path: string) => {
  const parts = resolvePath(path).split(sep);

  while (parts.length > 0) {
    const entries = await readdir(parts.join(sep), { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules' && entry.isDirectory()) {
        return resolvePath(parts.join(sep), entry.name);
      }
    }

    parts.pop();
  }

  /* TBD: handle in some better way? */
  throw new Error(`Unable to find node_modules directory from ${path}`);
};
