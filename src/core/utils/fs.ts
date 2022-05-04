import fsExtra from 'fs-extra';
import path from 'path';

/** TBD: remove this shitty reexport */
export const { emptyDir, remove: removeFile, writeJson, readJSON, writeFile, readFile, ensureDir, copyFile, pathExists } = fsExtra;

export const fsExists = async (path: string) => {
  try {
    await fsExtra.access(path);

    return true;
  } catch {
    return false;
  }
};

export const { resolve: resolvePath } = path;
