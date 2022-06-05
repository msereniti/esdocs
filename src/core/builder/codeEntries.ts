import { basename as resolvePathBasename } from 'path';
import { SourceMapConsumer } from 'source-map';

import { EsDocsFrameworkIntegration, outOfTheBoxFrameworks } from '../../integrations/frameworks/frameworks';
import { getAllConfigurations, getConfiguration } from '../configuration/configuration';
import { esDocsFs } from '../utils/fs';
import { parentDir } from '../utils/parentDir';
import { runBundler } from './bundler';
// import { cleanUp } from './cleanUp';
import { Playground, tmpFilesPrefix } from './definitions';

type PlaygroundChunkEntryPoint = {
  playgroundId: string;
  playgroundCodeEntryIndex: number;
  framework: string;
  filePath: string;
  entryId: string;
};

export const precompilePlaygroundCodeEntries = async (playgrounds: Playground[]): Promise<PlaygroundChunkEntryPoint[]> => {
  const precompiledPlaygroundChunks = await Promise.all(
    playgrounds.map(async (playground) => {
      const files = playground.files.map((file, index) => {
        const tmpFileName = `${tmpFilesPrefix}_${playground.id}_${index}.${file.extention}`;
        const fileName = file.name ?? tmpFileName;

        return {
          path: esDocsFs.resolvePath(parentDir(file.source.path), fileName),
          details: file,
        };
      });

      const reservedPaths = (
        await Promise.all(
          files.map(async (file) => ({
            file,
            pathReserved: await esDocsFs.exists(file.path),
          }))
        )
      )
        .filter(({ pathReserved }) => pathReserved)
        .map(({ file }) => file);

      if (reservedPaths.length > 0) {
        const conflicts = reservedPaths
          .map(({ path, details }) => `${path} produced by ${details.source.path}:${details.source.from.line}:${details.source.from.column}`)
          .join(', ');
        const conflictsPrefix = reservedPaths.length > 1 ? `Conflicts list:` : 'Conflicted path is';

        const message = `Unable to output code entries to individual files as far as file system paths was already taken. Probably you need to specify other code entry name (like \`\`\`ts my-file.ts -> \`\`\`ts example-file.ts). ${conflictsPrefix} ${conflicts}`;

        throw new Error(message);
      }

      for (const file of files) {
        let content = file.details.content;
        const { globals } = getConfiguration(file.path);
        if (file.path.endsWith('.js') && Object.keys(globals).length > 0) {
          const prepand = `const { ${Object.keys(globals).join(', ')} } = ${JSON.stringify(globals)};\n`;
          content = prepand + content;
        }
        esDocsFs.putTmpFileWrite(file.path, content);
      }

      return files.map((file, index) => ({
        playgroundId: playground.id,
        playgroundCodeEntryIndex: index,
        framework: playground.framework,
        filePath: file.path,
        entryId: `${playground.id}_${index}`,
      }));
    })
  );

  return precompiledPlaygroundChunks.flat();
};

export const buildPlaygroundCodeEntries = async (playgrounds: Playground[], destinationDirectoryPath: string, sourceDirectoryPath: string) => {
  const bundlerEntryPoints = await precompilePlaygroundCodeEntries(playgrounds);
  const codeEntriesOutputDir = esDocsFs.resolvePath(destinationDirectoryPath, 'assets');

  const configurations = getAllConfigurations();
  const frameworks: { [frameworkName: string]: EsDocsFrameworkIntegration } = { ...outOfTheBoxFrameworks };
  for (const config of configurations) {
    for (const frameworkName in config?.contents.frameworks || {}) {
      frameworks[frameworkName] = (config?.contents.frameworks || {})[frameworkName];
    }
  }

  const entryPointsByFramework = bundlerEntryPoints.reduce(
    (acc, entryPoint) => ({
      ...acc,
      [entryPoint.framework]: [...(acc[entryPoint.framework] || []), entryPoint],
    }),
    {} as {
      [frameworkName: string]: PlaygroundChunkEntryPoint[];
    }
  );

  await esDocsFs.commitTmps();

  const codeEntriesChunks = (
    await Promise.all(
      Object.entries(entryPointsByFramework).map(([frameworkName, entryPoints]) => {
        if (!(frameworkName in frameworks)) {
          throw new Error(`Framework ${frameworkName} is not configurated`);
        }
        const framework = frameworks[frameworkName as keyof typeof frameworks];
        const entryPointsMap = Object.fromEntries(entryPoints.map(({ filePath, entryId }) => [entryId, filePath]));
        const external = framework.dependencies.map(({ from }) => from);

        return runBundler({
          entryPoints: entryPointsMap,
          external,
          outputDir: codeEntriesOutputDir,
        });
      })
    )
  ).flat();

  await Promise.all(bundlerEntryPoints.map(({ filePath }) => esDocsFs.putTmpFileRemove(filePath)));

  const entryPointsByEntryId = Object.fromEntries(bundlerEntryPoints.map((entryPoint) => [entryPoint.entryId, entryPoint]));
  const outputPaths: { [playgroundId: string]: string[] } = {};

  for (const chunk of codeEntriesChunks) {
    const entryPoint = entryPointsByEntryId[chunk.id];

    outputPaths[entryPoint.playgroundId] = outputPaths[entryPoint.playgroundId] || [];
    outputPaths[entryPoint.playgroundId][entryPoint.playgroundCodeEntryIndex] = resolvePathBasename(chunk.chunkFilePath);
  }

  const playgroundFiles = playgrounds.map((playground) => ({
    id: playground.id,
    framework: playground.framework,
    codeEntries: playground.files.map((file, index) => ({
      name: file.name,
      extention: {
        source: file.extention,
        compiled: outputPaths[playground.id][index].split('.').pop()!,
      },
      path: outputPaths[playground.id][index],
      sourceCode: file.content,
    })),
  }));

  const playgroundsOutputDir = esDocsFs.resolvePath(destinationDirectoryPath, 'playgrounds');

  await Promise.all(playgroundFiles.map((file) => esDocsFs.writeOutputJson(esDocsFs.resolvePath(playgroundsOutputDir, `${file.id}.json`), file)));
};
