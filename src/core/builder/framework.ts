import { EsDocsFrameworkIntegration, outOfTheBoxFrameworks } from '../../integrations/frameworks/frameworks';
import { getAllConfigurations } from '../configuration/configuration';
import { esDocsFs } from '../utils/fs';
import { runBundler } from './bundler';
import { tmpFilesPrefix } from './definitions';

export const setupFrameworks = async (destinationPath: string) => {
  const configs = getAllConfigurations();
  const availableFrameworks: { [framework: string]: EsDocsFrameworkIntegration } = { ...outOfTheBoxFrameworks };
  for (const config of configs) {
    for (const framework in config!.contents.frameworks || {}) {
      availableFrameworks[framework] = config!.contents.frameworks![framework];
    }
  }
  const usedFrameworks: { [frameworkName: string]: EsDocsFrameworkIntegration } = {};
  for (const config of configs) {
    if (!config?.contents.framework) continue;
    const framework = typeof config?.contents.framework === 'string' ? availableFrameworks[config.contents.framework] : config.contents.framework;
    if (!framework) {
      throw new Error(`Framework ${config?.contents.framework} is not available. Configurated frameworks: ${Object.keys(availableFrameworks).join(', ')}`);
    }

    usedFrameworks[framework.name] = framework;
  }

  const frameworks = Object.values(usedFrameworks);

  /** Tbd: throw on frameworks names collision or \W in name or \W in dependencies */

  const tmpDirPath = esDocsFs.resolvePath(`./${tmpFilesPrefix}/frameworks_dependencies`);

  // if (await esDocsFs.exists(tmpDirPath)) {
  //   await esDocsFs.emptyDir(tmpDirPath);
  // }

  // await esDocsFs.ensureDir(tmpDirPath);

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

      esDocsFs.putTmpFileWrite(esDocsFs.resolvePath(tmpDirPath, `${name}.js`), content);
    })
  );

  await esDocsFs.commitTmps();

  await Promise.all(
    frameworks.map((framework) =>
      runBundler({
        entryPoints: {
          [framework.name]: esDocsFs.resolvePath(tmpDirPath, `${framework.name}.js`),
        },
        external: framework.external || [],
        outputDir: esDocsFs.resolvePath(destinationPath, 'dependencies'),
      })
    )
  );

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

  await esDocsFs.writeOutputFile(esDocsFs.resolvePath(destinationPath, 'frameworks.js'), frameworksFile);
};
