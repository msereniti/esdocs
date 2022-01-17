import { emptyDir } from 'fs-extra';
import parseImports from 'parse-imports';
import { dirname, relative as resolveRelativePath } from 'path';

import { outOfTheBoxFrameworks } from '../../integrations/frameworks/frameworks';
import { resolvePath, writeFile } from '../utils/fs';
import { parentDir } from '../utils/parentDir';
import { runBundler } from './bundler';
import { cleanUp } from './cleanUp';
import { Playground, tmpFilesPrefix } from './definitions';

const processImports = async (codeText: string) => {
  const importStatements = await parseImports(codeText);
  let lastStaticImportIndex = 0;
  const importedVariables: string[] = [];

  for (const importStatement of importStatements) {
    /* TBD: add warning about dynamic imports  */
    if (!importStatement.isDynamicImport) {
      lastStaticImportIndex = importStatement.endIndex + 1;
    }
    const importClause = importStatement.importClause! || {};
    const defaultImport = importClause.default || importClause.namespace;
    const destructedImports = importClause.named.map(({ binding }) => binding);

    importedVariables.push(...destructedImports);
    if (defaultImport) {
      importedVariables.push(defaultImport);
    }
  }

  return {
    lastStaticImportIndex,
    importedVariables,
  };
};

export type PlaygroundChunkEntryPoint = {
  filePath: string;
  framework: string;
  entryId: string;
};

export const precompilePlaygrounds = async (
  playgrounds: Playground[]
): Promise<PlaygroundChunkEntryPoint[]> => {
  const precompiledPlaygroundChunks = await Promise.all(
    playgrounds.map(async (playground) => {
      const path = resolvePath(
        parentDir(playground.sourceFilePath),
        `${tmpFilesPrefix}_${playground.id}.${playground.extension}`
      );

      await writeFile(path, playground.content);

      return [
        {
          filePath: path,
          framework: playground.framework,
          entryId: playground.id,
        },
      ];
      // const importsChunkPath = resolvePath(
      //   parentDir(playground.sourceFilePath),
      //   `${tmpFilesPrefix}_${playground.id}_imports.${playground.extension}`
      // );
      // const runtimeChunkPath = resolvePath(
      //   parentDir(playground.sourceFilePath),
      //   `${tmpFilesPrefix}_${playground.id}_runtime.${playground.extension}`
      // );

      // console.log(playground.content);

      // const { lastStaticImportIndex, importedVariables } = await processImports(
      //   playground.content
      // );

      // const fullContent = playground.content;
      // const importsContent = fullContent.substring(0, lastStaticImportIndex);
      // const runtimeContent = fullContent.substring(lastStaticImportIndex);
      // const importedVariablesJoin = importedVariables.join(', ');

      // const importsConsumer = `globalThis.____esDocsImportsGlobalContext.playgrounds["${playground.id}"].imports = { ${importedVariablesJoin} };`;
      // const importsProvider = `const { ${importedVariablesJoin} } = globalThis.____esDocsImportsGlobalContext.playgrounds["${playground.id}"].imports;`;

      // const wrappedImportsContent = importsContent + '\n' + importsConsumer;
      // const wrappedRuntimeContent =
      //   `globalThis.____esDocsImportsGlobalContext.playgrounds["${playground.id}"].runtime = (() => {\n` +
      //   importsProvider +
      //   '\n' +
      //   runtimeContent +
      //   '\n});';

      // await Promise.all([
      //   writeFile(importsChunkPath, wrappedImportsContent),
      //   writeFile(runtimeChunkPath, wrappedRuntimeContent),
      // ]);

      // return [
      //   {
      //     filePath: importsChunkPath,
      //     entryId: `${playground.id}_imports`,
      //   },
      //   {
      //     filePath: runtimeChunkPath,
      //     entryId: `${playground.id}_runtime`,
      //   },
      // ];
    })
  );

  return precompiledPlaygroundChunks.flat();
};

export const buildPlaygrounds = async (
  playgrounds: Playground[],
  destinationDirectoryPath: string,
  sourceDirectoryPath: string
) => {
  const bundlerEntryPoints = await precompilePlaygrounds(playgrounds);
  const outputDir = resolvePath(destinationDirectoryPath, 'playgrounds');
  const frameworks = outOfTheBoxFrameworks;

  const entryPointsByFramework = bundlerEntryPoints.reduce(
    (acc, entryPoint) => ({
      ...acc,
      [entryPoint.framework]: [
        ...(acc[entryPoint.framework] || []),
        entryPoint,
      ],
    }),
    {} as {
      [frameworkName: string]: PlaygroundChunkEntryPoint[];
    }
  );

  const allFrameworks = await Promise.all(
    Object.entries(entryPointsByFramework).map(
      ([frameworkName, entryPoints]) => {
        if (!(frameworkName in frameworks)) {
          throw new Error(`Framework ${frameworkName} is not defined`);
        }
        const framework = frameworks[frameworkName as keyof typeof frameworks];
        const entryPointsMap = Object.fromEntries(
          entryPoints.map(({ filePath, entryId }) => [entryId, filePath])
        );
        const external = framework.dependencies.map(({ from }) => from);

        return runBundler({
          entryPoints: entryPointsMap,
          external,
          outputDir,
        });
      }
    )
  );
  const playgroundsChunks = allFrameworks.flat();
  // const playgroundsChunks = await runBundler({
  //   entryPoints: Object.fromEntries(
  //     bundlerEntryPoints.map(({ filePath, entryId }) => [entryId, filePath])
  //   ),
  //   outputDir: resolvePath(destinationDirectoryPath, 'playgrounds'),
  // });

  await cleanUp(sourceDirectoryPath, tmpFilesPrefix);

  await emptyDir(resolvePath(destinationDirectoryPath, 'setup'));

  const playgroundsFilePath = resolvePath(
    destinationDirectoryPath,
    'setup',
    'playgrounds.js'
  );
  const playgroundsFile = playgroundsChunks
    .map(({ id, chunkFilePath }) => {
      const path = resolveRelativePath(
        dirname(playgroundsFilePath),
        chunkFilePath
      );

      return `export const ${id} = () => import("${path}")`;
    })
    .join('\n');

  await writeFile(playgroundsFilePath, playgroundsFile);
};
