import { sep } from 'path';

export const parentDir = (path: string) => {
  if (path.endsWith(sep)) {
    path = path.substring(0, path.length - 1);
  }

  const parts = path.split(sep);

  return parts.slice(0, parts.length - 1).join(sep);
};
