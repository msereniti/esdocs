import { ensureDir, pathExists, remove } from 'fs-extra';

import { outOfTheBoxFrameworks } from '../../integrations/frameworks/frameworks';
import { resolvePath, writeFile } from '../utils/fs';
import { runBundler } from './bundler';
import { tmpFilesPrefix } from './definitions';

export const setupFrameworks = async (destinationPath: string) => {
  const frameworks = [outOfTheBoxFrameworks.react];

  /** Tbd: throw on frameworks names collision or \W in name or \W in dependencies */
  /** Tbd: check that all requested frameworks provided */

  const tmpDirPath = resolvePath(`./${tmpFilesPrefix}_frameworks_dependencies`);

  if (await pathExists(tmpDirPath)) {
    await remove(tmpDirPath);
  }

  await ensureDir(tmpDirPath);

  await Promise.all(
    frameworks.map(({ name, dependencies }) => {
      const exportedModules: string[] = [];
      const dependenciesNames: string[] = [];
      const importExpressions: string[] = [];

      for (const dependency of dependencies) {
        const { from } = dependency;

        if (Array.isArray(dependency.import)) {
          dependenciesNames.push(...dependency.import);
          const join = dependency.import.join(', ');

          importExpressions.push(`import { ${join} } from "${from}";`);
          exportedModules.push(`["${from}"]: { ${join} }`);
        } else {
          const { name, source } = dependency.import;

          dependenciesNames.push(name);
          exportedModules.push(`["${from}"]: ${name}`);
          if (source === '*') {
            importExpressions.push(`import * as ${name} from "${from}";`);
          } else if (source === 'default') {
            importExpressions.push(`import ${name} from "${from}";`);
          } else {
            throw new Error(`Unknown dependency source "${source}"`);
          }
        }
      }

      const exportedVariablesJoin = dependenciesNames.join(', ');
      const exportedModulesJoin = exportedModules.join(', ');

      const content =
        importExpressions.join('\n') +
        '\n' +
        `globalThis.____esDocsImportsGlobalContext.frameworkDependencies["${name}"] = { variables: { ${exportedVariablesJoin} }, modules: { ${exportedModulesJoin} } };`;

      // const content =
      //   dependencies.map((dependency) => {
      //     if (Array.isArray(dependency.import)) {
      //       return `import { ${dependency.import.join(', ')} } from "${dependency.from}";`;
      //     }
      //   }) +
      //   '\n' +
      //   `export const ____dependencies____ = { ${dependenciesNamesJoin} };`;

      writeFile(resolvePath(tmpDirPath, `${name}.js`), content);
    })
  );

  await Promise.all(
    frameworks.map((framework) =>
      runBundler({
        entryPoints: {
          [framework.name]: resolvePath(tmpDirPath, `${framework.name}.js`),
        },
        external: framework.external || [],
        outputDir: resolvePath(destinationPath, 'dependencies'),
      })
    )
  );

  if (await pathExists(tmpDirPath)) {
    await remove(tmpDirPath);
  }

  /** Tbd: async load init */
  const frameworksNamesJoin = frameworks.map(({ name }) => name).join(', ');

  const frameworksFile =
    frameworks
      .map((framework) => {
        const init = JSON.stringify(framework.handlers);

        return `export const ${framework.name} = { handlers: ${init}, loadDependencies: () => import("./dependencies/${framework.name}.js") };`;
      })
      .join('\n') +
    '\n' +
    `const defaultExport = { ${frameworksNamesJoin} };\n` +
    'export default defaultExport;';

  await writeFile(resolvePath(destinationPath, 'frameworks.js'), frameworksFile);
};
