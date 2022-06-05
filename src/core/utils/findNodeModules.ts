import { sep } from 'path';

import { esDocsFs } from './fs';

export const findNodeModules = async (path: string) => {
  const parts = esDocsFs.resolvePath(path).split(sep);

  while (parts.length > 0) {
    const entries = await esDocsFs.readDir(parts.join(sep), { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules' && entry.isDirectory()) {
        return esDocsFs.resolvePath(parts.join(sep), entry.name);
      }
    }

    parts.pop();
  }

  /* TBD: handle in some better way? */
  throw new Error(`Unable to find node_modules directory from ${path}`);
};
