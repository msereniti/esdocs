import { sep } from 'path';

export const makeCommonPath = (paths: string[]) => {
  let commonPath = paths[0];

  for (const path of paths) {
    const pathParts = path.split(sep);

    if (!path.startsWith(commonPath)) {
      const firstDifferentPartIndex = commonPath.split(sep).findIndex((part, index) => part !== pathParts[index]);

      commonPath = pathParts.slice(0, firstDifferentPartIndex).join(sep);
    }
  }

  return commonPath;
};
