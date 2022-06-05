import { build as esbuild } from 'esbuild';

import { getEsbuildConfigBase } from '../../view/esbuildConfigBase';
import { setupConfiguration } from '../configuration/configuration';
import { esDocsFs } from '../utils/fs';
import { logger } from '../utils/logger';
import { recursiveReadDir } from '../utils/recursive-readdir';
import { buildPlaygroundCodeEntries } from './codeEntries';
import { collectArticles } from './collectArticles';
import { Playground } from './definitions';
import { setupFrameworks } from './framework';
import { getMdxHandler } from './handleMdx';
import { buildHost, setupHost } from './host';
import { buildNavigation } from './navigation/navigation';
import { bundleProgrammingLanguagesFiles } from './programmingLanguages';
import { buildView } from './view';

const runBuild = async (sourceDirectoryPath: string, destinationDirectoryPath: string) => {
  const programmingLanguages: string[] = [];
  const playgrounds: Playground[] = [];
  const articlesLabelsByPath: Record<string, string> = {};

  logger.verbose('Collecting article files');
  const articles = await collectArticles(sourceDirectoryPath);
  logger.verbose(`Collected ${articles.length} article files`);

  const articlesDestPath = esDocsFs.resolvePath(destinationDirectoryPath, 'articles');

  logger.verbose('Running articles building');

  await esbuild({
    entryPoints: articles,
    plugins: [getMdxHandler({ playgrounds, articlesLabelsByPath, programmingLanguages }), ...getEsbuildConfigBase([], articlesDestPath).plugins!],
    bundle: true,
    outdir: articlesDestPath,
    format: 'esm',
    external: ['react', 'react-dom', 'esdocs'],
  });

  logger.verbose('Collecting built articles');

  const bundledArticles = await recursiveReadDir(articlesDestPath, { endsWith: '.js' });

  logger.verbose(`Collected ${bundledArticles.length} built articles`);

  await buildPlaygroundCodeEntries(playgrounds, destinationDirectoryPath, sourceDirectoryPath);

  await buildNavigation({ rawArticles: articles, bundledArticles, articlesLabelsByPath }, esDocsFs.resolvePath(destinationDirectoryPath, 'setup', 'navigation'));
  await bundleProgrammingLanguagesFiles(programmingLanguages, esDocsFs.resolvePath(destinationDirectoryPath, 'setup', 'programmingLanguages'));
  await setupFrameworks(esDocsFs.resolvePath(destinationDirectoryPath, 'setup', 'frameworks'));
  await setupHost(esDocsFs.resolvePath(destinationDirectoryPath, 'setup', 'host'));
  await esDocsFs.commitOutputWrites(destinationDirectoryPath);

  await buildView(esDocsFs.resolvePath(destinationDirectoryPath, 'view'));
  await buildHost(destinationDirectoryPath);
  await esDocsFs.commitOutputWrites(destinationDirectoryPath);
};

export const builder = async (sourceDirectoryPath: string, destinationDirectoryPath = esDocsFs.resolvePath(process.cwd(), './dist/demo')) => {
  try {
    await setupConfiguration();
    logger.verbose('Clearing output directory');
    await esDocsFs.clearOutputDir(destinationDirectoryPath);
    logger.verbose('Running builder');
    await runBuild(sourceDirectoryPath, destinationDirectoryPath);
    await esDocsFs.clearTmps();
  } catch (error) {
    await esDocsFs.clearTmps();

    throw error;
  }
};

const gracefulShutdownHandler = () => {
  logger.info('\nCleaning up tmp files...');
  esDocsFs.clearTmps().then(() => {
    logger.info('Cleaning up tmp files done.');
    process.exit(1);
  });
};

process.on('SIGTERM', gracefulShutdownHandler);
process.on('SIGINT', gracefulShutdownHandler);
