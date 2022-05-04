import { recursiveReadDir } from '../utils/recursive-readdir';

export const collectArticles = async (directoryPath: string) => {
  return await recursiveReadDir(directoryPath, {
    endsWith: ['.md', '.mdx'],
    // startsWith: 'button.md',
  });
};
