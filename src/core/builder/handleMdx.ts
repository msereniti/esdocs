import { compile as compileMdx } from '@mdx-js/mdx';
import { Plugin as EsBuildPlugin } from 'esbuild';

import { readFile } from '../utils/fs';
import { TraverseCollections } from './definitions';
import { getArticlesHandler } from './handleArticles';

export const getMdxHandler = (
  traverseCollections: TraverseCollections
): EsBuildPlugin => ({
  name: 'esdocs-esbuild-mdx',
  setup: (build) => {
    build.onLoad({ filter: /\.mdx?$/ }, async (args) => {
      const text = await readFile(args.path, 'utf8');

      const { value: contents } = await compileMdx(text, {
        remarkPlugins: [getArticlesHandler(args.path, traverseCollections)],
      });

      return {
        contents,
        loader: 'jsx',
      };
    });
  },
});
