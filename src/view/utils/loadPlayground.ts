import frameworks from '@setup/frameworks/frameworks.js';

import { logsApi, makeLogger } from '../logger/logger';
import { InitRuntime } from '../playground/runtime/runtime';
import { evaluateWithContext } from './evaluateWithContext';
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
    frameworkDependencies: {},
  };
};

export const loadPlayground = async (playgroundId: string): Promise<{ playground: Playground; initRuntime: InitRuntime }> => {
  initGlobalImportsContext();
  const playground: Playground = await loadJsonFile(`/playgrounds/${playgroundId}.json`);

  const framework = frameworks[playground.framework];

  await framework.loadDependencies();
  const frameworkDependencies = globalThis.____esDocsImportsGlobalContext.frameworkDependencies[playground.framework] || {};
  const logger = makeLogger(playground.id);
  const setUpEvalExecutor = (executor: (toEval: string) => void) => logsApi.registerContextExecutor(playgroundId, executor);

  const scopeVariables = {
    /** TBD: output warning if console dep provided */
    console: logger.console,
    ...frameworkDependencies.variables,
  };
  const providedModules = {
    ...frameworkDependencies.modules,
  };

  const evaluatedPlaygroundFiles = await Promise.all(
    playground.codeEntries.map((codeEntry) => {
      const chunkUrl = `/codeEntries/${codeEntry.path}`;

      if (codeEntry.extention.compiled === 'js') {
        return loadModule(chunkUrl, {
          scopeImports: scopeVariables,
          requirableModules: providedModules,
        });
      } else {
        return loadTextFile(chunkUrl);
      }
    })
  );

  const initRuntime: InitRuntime = (container) => {
    for (let index = 0; index < playground.codeEntries.length; index++) {
      const isLastCodeEntry = index === playground.codeEntries.length - 1;
      const file = playground.codeEntries[index];
      /* TBD: handle missed extention */
      const fileExtention = file.extention.compiled;
      /* TBD: handle missed handler */
      const fileHandler = framework.handlers[fileExtention];
      const initIife = `(${fileHandler})(____evaluatedRuntime____, ____container____)`;

      const context = {
        ...scopeVariables,
        ____evaluatedRuntime____: evaluatedPlaygroundFiles[index],
        ____container____: container,
      };

      if (index === 2) {
        context.____setUpEsDocsEvalExecutor____ = setUpEvalExecutor;
      }

      evaluateWithContext(initIife, context);
    }
  };

  return { playground, initRuntime };

  // console.log()

  // const [playground, dependenciesModule] = await Promise.all([
  //   loadPlayground(),
  //   framework.loadDependencies(),
  // ]);
  // const loadPlayground = playgrounds[playgroundId];

  /** TBD: handle not loaded properly */
  // const [playground, dependenciesModule] = await Promise.all([
  //   loadPlayground(),
  //   framework.loadDependencies(),
  // ]);
  // const frameworkDependencies = dependenciesModule.____dependencies____;

  // const playgroundUrl = `./playgrounds/${playgroundId}.js`;

  // let playgroundSetup = null as null | {
  //   imports: Record<string, unknown>;
  //   runtimeExpression: string;
  // };

  // const handlePlaygroundSetup = (
  //   imports: Record<string, unknown>,
  //   runtimeFunction: () => void
  // ) => {
  //   const runtimeLines = runtimeFunction.toString().split('\n');

  //   const runtimeExpression = runtimeLines
  //     .slice(1, runtimeLines.length - 1)
  //     .join('\n');

  //   playgroundSetup = { imports, runtimeExpression };
  // };

  // const logger = makeLogger(playgroundId);

  // await loadModule(
  //   playgroundUrl,
  //   {
  //     /** TBD: output warning if console dep provided */
  //     console: logger,
  //     ...frameworkDependencies,
  //     ____handlePlaygroundSetup____: handlePlaygroundSetup,
  //   },
  //   {}
  // );

  // if (playgroundSetup === null) {
  //   const errorMessage = `Playground ${playgroundUrl} (${playgroundId}) were not loaded properly. After evaluating module code ____handlePlaygroundSetup____ function were not called`;

  //   throw new Error(errorMessage);
  // }

  // const evaluatedRuntime = evaluateWithContext(
  //   playgroundSetup.runtimeExpression,
  //   {
  //     console: logger,
  //     ...frameworkDependencies,
  //     ____playgroundImports____: playgroundSetup.imports,
  //   }
  // );

  // const initFunction = framework.init;
  // const initIife = `(${initFunction})(____evaluatedRuntime____, ____container____)`;

  // const initRuntime = (container: HTMLElement) =>
  //   evaluateWithContext(initIife, {
  //     ...frameworkDependencies,
  //     ____evaluatedRuntime____: evaluatedRuntime,
  //     ____container____: container,
  //   });

  // return initRuntime;
};
