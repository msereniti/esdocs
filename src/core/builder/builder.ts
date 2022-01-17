import { build as esbuild } from 'esbuild';
import { ensureDir } from 'fs-extra';

import { emptyDir, resolvePath } from '../utils/fs';
import { recursiveReadDir } from '../utils/recursive-readdir';
import { cleanUp } from './cleanUp';
import { collectArticles } from './collectArticles';
import { Playground, tmpFilesPrefix } from './definitions';
import { setupFrameworks } from './framework';
import { getMdxHandler } from './handleMdx';
import { buildHost } from './host';
import { buildNavigation } from './navigation/navigation';
import { buildPlaygrounds } from './playgrounds';
import { bundleProgrammingLanguagesFiles } from './programmingLanguages';
import { buildView } from './view';

const runBuild = async (
  sourceDirectoryPath: string,
  destinationDirectoryPath: string
) => {
  /** Building articles */

  const programmingLanguages: string[] = [];
  const playgrounds: Playground[] = [];
  const articlesLabelsByPath: Record<string, string> = {};

  const articles = await collectArticles(sourceDirectoryPath);

  console.log(articles);

  const articlesDestPath = resolvePath(destinationDirectoryPath, 'articles');

  await esbuild({
    entryPoints: articles,
    plugins: [
      getMdxHandler({
        playgrounds,
        articlesLabelsByPath,
        programmingLanguages,
      }),
    ],
    bundle: true,
    outdir: articlesDestPath,
    format: 'esm',
    external: ['react'],
  });
  const bundledArticles = await recursiveReadDir(articlesDestPath, {
    endsWith: '.js',
  });

  /** Building playgrounds */

  await buildPlaygrounds(
    playgrounds,
    destinationDirectoryPath,
    sourceDirectoryPath
  );

  /** Building navigation */
  await ensureDir(resolvePath(destinationDirectoryPath, 'setup', 'navigation'));

  await buildNavigation(
    {
      rawArticles: articles,
      bundledArticles,
      articlesLabelsByPath,
    },
    resolvePath(destinationDirectoryPath, 'setup', 'navigation')
  );

  /** Setup syntax highlight for programming languages */

  await ensureDir(
    resolvePath(destinationDirectoryPath, 'setup', 'programmingLanguages')
  );

  await bundleProgrammingLanguagesFiles(
    programmingLanguages,
    resolvePath(destinationDirectoryPath, 'setup', 'programmingLanguages')
  );

  /** Setup frameworks */

  await ensureDir(resolvePath(destinationDirectoryPath, 'setup', 'frameworks'));

  await setupFrameworks(
    resolvePath(destinationDirectoryPath, 'setup', 'frameworks')
  );

  /** Build view and host */

  await buildView(resolvePath(destinationDirectoryPath, 'view'));

  await buildHost(destinationDirectoryPath);
};

export const builder = async (
  sourceDirectoryPath: string,
  destinationDirectoryPath = './dist/test'
) => {
  await emptyDir(destinationDirectoryPath);
  await cleanUp(sourceDirectoryPath, tmpFilesPrefix);

  try {
    await runBuild(sourceDirectoryPath, destinationDirectoryPath);
  } catch (error) {
    /* TBD: added graceful shutdown common mechanism */
    await cleanUp(sourceDirectoryPath, tmpFilesPrefix);

    throw error;
  }
};
