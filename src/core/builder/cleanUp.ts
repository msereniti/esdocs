import { remove } from 'fs-extra';

import { recursiveReadDir } from '../utils/recursive-readdir';

export const cleanUp = async (
  directoryPath: string,
  prefix: string,
  maxDepth = Infinity
) => {
  const files = await recursiveReadDir(
    directoryPath,
    {
      startsWith: prefix,
    },
    maxDepth
  );

  await Promise.all(files.map((filePath) => remove(filePath)));
};
