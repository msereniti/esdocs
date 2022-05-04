import fs from 'fs-extra';
import { basename as resolvePathBasename } from 'path';
import { SourceMapConsumer } from 'source-map';

import { outOfTheBoxFrameworks } from '../../integrations/frameworks/frameworks';
import { fsExists, readFile, readJSON, removeFile, resolvePath, writeFile } from '../utils/fs';
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
          path: resolvePath(parentDir(file.source.path), fileName),
          details: file,
        };
      });

      const reservedPaths = (
        await Promise.all(
          files.map(async (file) => ({
            file,
            pathReserved: await fsExists(file.path),
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

      await Promise.all(files.map((file) => writeFile(file.path, file.details.content)));

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
  const codeEntriesOutputDir = resolvePath(destinationDirectoryPath, 'codeEntries');
  const frameworks = outOfTheBoxFrameworks;

  const entryPointsByFramework = bundlerEntryPoints.reduce(
    (acc, entryPoint) => ({
      ...acc,
      [entryPoint.framework]: [...(acc[entryPoint.framework] || []), entryPoint],
    }),
    {} as {
      [frameworkName: string]: PlaygroundChunkEntryPoint[];
    }
  );

  const codeEntriesChunks = (
    await Promise.all(
      Object.entries(entryPointsByFramework).map(([frameworkName, entryPoints]) => {
        if (!(frameworkName in frameworks)) {
          throw new Error(`Framework ${frameworkName} is not defined`);
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

  await Promise.all(bundlerEntryPoints.map(({ filePath }) => removeFile(filePath)));

  // await cleanUp(sourceDirectoryPath, tmpFilesPrefix);

  const entryPointsByEntryId = Object.fromEntries(bundlerEntryPoints.map((entryPoint) => [entryPoint.entryId, entryPoint]));
  const outputPaths: { [playgroundId: string]: string[] } = {};
  const hasSourceMaps: { [playgroundId: string]: boolean[] } = {};

  for (const chunk of codeEntriesChunks) {
    const entryPoint = entryPointsByEntryId[chunk.id];

    outputPaths[entryPoint.playgroundId] = outputPaths[entryPoint.playgroundId] || [];
    outputPaths[entryPoint.playgroundId][entryPoint.playgroundCodeEntryIndex] = resolvePathBasename(chunk.chunkFilePath);
    hasSourceMaps[entryPoint.playgroundId] = hasSourceMaps[entryPoint.playgroundId] || [];
    hasSourceMaps[entryPoint.playgroundId][entryPoint.playgroundCodeEntryIndex] = chunk.hasSourceMaps;
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
      hasSourceMaps: hasSourceMaps[playground.id][index],
    })),
  }));

  // await Promise.all(
  //   playgroundFiles.map(({ codeEntries }) =>
  //     Promise.all(
  //       codeEntries.map(async (codeEntry) => {
  //         if (!codeEntry.hasSourceMaps) return;
  //         const compiledCodePath = resolvePath(codeEntriesOutputDir, codeEntry.path);
  //         const compiledCode = await readFile(compiledCodePath, 'utf-8');
  //         const lines = compiledCode.split('\n');

  //         for (let i = lines.length - 1; i >= 0; i--) {
  //           if (lines[i].startsWith('//# sourceMappingURL=')) {
  //             const sourceMapFileName = lines[i].substring('//# sourceMappingURL='.length);
  //             const sourceMapFilePath = resolvePath(codeEntriesOutputDir, sourceMapFileName);
  //             const sourceMap = await readJSON(sourceMapFilePath);

  //             const whatever = await SourceMapConsumer.with(sourceMap, null, (consumer) => {
  //               consumer.eachMapping((mapping) => {
  //                 // consumer.allGeneratedPositionsFor(mapping);
  //                 // const position = consumer.originalPositionFor({
  //                 //   line: mapping.generatedLine,
  //                 //   column: mapping.generatedColumn,
  //                 // });

  //                 // console.log(mapping);
  //                 const sourceCode = consumer.sourceContentFor(mapping.source);
  //                 const originalLine = sourceCode!.split('\n')[mapping.originalLine - 1];
  //                 const generatedLine = compiledCode
  //                   .split('\n')
  //                   [mapping.generatedLine - 1].substring(mapping.generatedColumn);

  //                 if (generatedLine.includes('c')) {
  //                   // if (generatedLine.startsWith('var')) {
  //                   console.log(originalLine.substring(mapping.originalColumn));
  //                   console.log(generatedLine);
  //                   console.log('---');
  //                 }

  //                 // if (mapping.originalColumn === 71) {
  //                 //   console.log(consumer.sources);
  //                 //   console.log(mapping);
  //                 //   console.log(codeEntry.path);
  //                 //   console.log(originalLine.substring(mapping.originalColumn));
  //                 //   console.log(generatedLine);
  //                 //   console.log('---');
  //                 //   console.log(compiledCode);
  //                 // }
  //               });
  //               // consumer.allGeneratedPositionsFor();
  //               // // [ 'http://example.com/www/js/one.js',
  //               // //   'http://example.com/www/js/two.js' ]

  //               // console.log(
  //               //   consumer.originalPositionFor({
  //               //     line: 2,
  //               //     column: 28,
  //               //   })
  //               // );
  //               // // { source: 'http://example.com/www/js/two.js',
  //               // //   line: 2,
  //               // //   column: 10,
  //               // //   name: 'n' }

  //               // console.log(
  //               //   consumer.generatedPositionFor({
  //               //     source: 'http://example.com/www/js/two.js',
  //               //     line: 2,
  //               //     column: 10,
  //               //   })
  //               // );
  //               // // { line: 2, column: 28 }

  //               // consumer.eachMapping((m) => {
  //               //   // ...
  //               // });

  //               // console.log(consumer);
  //             });

  //             return;
  //           } else if (lines[i].length > 0) {
  //             return;
  //           }
  //         }

  //         // await writeFile(compiledCodePath, lines.join('\n'));
  //         // const compiledCodeSOurceMapLine = lines.
  //         // const codeLastLine = compiledCode.split('\n').filter(Boolean).pop();
  //         // if (codeLastLine)
  //       })
  //     )
  //   )
  // );

  const playgroundsOutputDir = resolvePath(destinationDirectoryPath, 'playgrounds');

  await fs.ensureDir(playgroundsOutputDir);

  await Promise.all(playgroundFiles.map((file) => fs.writeJSON(resolvePath(playgroundsOutputDir, `${file.id}.json`), file)));

  // await emptyDir(resolvePath(destinationDirectoryPath, 'setup'));
};
