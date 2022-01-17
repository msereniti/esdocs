import fsExtra from 'fs-extra';
import path from 'path';

/** TBD: remove this shitty reexport */
export const {
  emptyDir,
  remove,
  writeJson,
  readJSON,
  writeFile,
  readFile,
  ensureDir,
  copyFile,
  pathExists,
} = fsExtra;

export const { resolve: resolvePath } = path;
