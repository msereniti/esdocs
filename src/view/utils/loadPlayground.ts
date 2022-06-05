// @ts-ignore
import frameworks from '@setup/frameworks/frameworks.js';

import { logsApi, makeLogger } from '../logger/logger';
import { InitRuntime } from '../playground/runtime/runtime';
import { evaluateWithContext, ExposedContextAccessor } from './evaluateWithContext';
import { loadJsonFile } from './loadJson';
import { loadModule } from './loadModule';
import { loadTextFile } from './loadTextFile';

export type CodeEntry = {
  name: string;
  extention: {
    source: string;
    compiled: string;
  };
  path: string;
  sourceCode: string;
};

export type Playground = {
  id: string;
  framework: string;
  codeEntries: CodeEntry[];
};

declare global {
  // eslint-disable-next-line no-var
  var ____esDocsImportsGlobalContext: {
    frameworkDependencies: {
      [frameworkName: string]: {
        variables: {
          [variableName: string]: any;
        };
        modules: {
          [importedModuleName: string]: any;
        };
      };
    };
  };
}

const initGlobalImportsContext = () => {
  globalThis.____esDocsImportsGlobalContext = globalThis.____esDocsImportsGlobalContext || {
    frameworkDependencies: {} as { variables: {}, modules: {}},
  };
};

export const loadPlayground = async (playgroundId: string): Promise<{ playground: Playground; initRuntime: InitRuntime }> => {
  initGlobalImportsContext();
  const playground: Playground = await loadJsonFile(`/playgrounds/${playgroundId}.json`);

  const framework = frameworks[playground.framework];

  await framework.loadDependencies();
  const frameworkDependencies = globalThis.____esDocsImportsGlobalContext.frameworkDependencies[playground.framework] || {};
  const logger = makeLogger(playground.id);
  const handleRuntimeVariables = (exposedVariables: ExposedContextAccessor) => {
    const executor = (toEval: string) => evaluateWithContext(toEval, exposedVariables.variablesContainer);

    logsApi.registerContextExecutor(playgroundId, executor, exposedVariables.variablesList);
  };

  const moduleContext = {
    /** TBD: output warning if console dep provided */
    console: logger.console,
    ...frameworkDependencies.variables,
  };
  const providedModules = {
    ...frameworkDependencies.modules,
  };

  const evaluatedPlaygroundFiles = await Promise.all(
    playground.codeEntries.map((codeEntry) => {
      const chunkUrl = `/assets/${codeEntry.path}`;

      if (codeEntry.extention.compiled === 'js') {
        return loadModule(chunkUrl, {
          context: moduleContext,
          requirableModules: providedModules,
          handleRuntimeVariables,
        });
      } else {
        return loadTextFile(chunkUrl);
      }
    })
  );

  const initRuntime: InitRuntime = (container) => {
    for (let index = 0; index < playground.codeEntries.length; index++) {
      const file = playground.codeEntries[index];
      /* TBD: handle missed extention */
      const fileExtention = file.extention.compiled;
      /* TBD: handle missed handler */
      const fileHandler = framework.handlers[fileExtention];
      const initIife = `(${fileHandler})(____evaluatedRuntime____, ____container____)`;

      const context = {
        ...moduleContext,
        ____evaluatedRuntime____: evaluatedPlaygroundFiles[index],
        ____container____: container,
      };

      evaluateWithContext(initIife, context);
    }
  };

  return { playground, initRuntime };
};
