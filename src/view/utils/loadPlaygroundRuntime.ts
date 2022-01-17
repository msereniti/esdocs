import frameworks from '@setup/frameworks/frameworks.js';

import { makeLogger } from '../logger/logger';
import { evaluateWithContext } from './evaluateWithContext';
import { loadModule } from './loadModule';

type InitRuntime = (container: HTMLElement) => void;

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
  globalThis.____esDocsImportsGlobalContext =
    globalThis.____esDocsImportsGlobalContext || {
      frameworkDependencies: {},
    };
};

export const loadPlaygroundRuntime = async (
  playgroundId: string,
  frameworkName: string
): Promise<InitRuntime> => {
  initGlobalImportsContext();

  /** TBD: handle missed framework */
  const framework = frameworks[frameworkName];

  await framework.loadDependencies();
  const frameworkDependencies =
    globalThis.____esDocsImportsGlobalContext.frameworkDependencies[
      frameworkName
    ] || {};
  const logger = makeLogger(playgroundId);

  const scopeVariables = {
    /** TBD: output warning if console dep provided */
    console: logger,
    ...frameworkDependencies.variables,
  };
  const providedModules = {
    ...frameworkDependencies.modules,
  };

  const playgroundChunkUrl = `./playgrounds/${playgroundId}.js`;
  const evaluatedRuntime = await loadModule(playgroundChunkUrl, {
    scopeImports: scopeVariables,
    requirableModules: providedModules,
  });

  const initRuntime: InitRuntime = (container) => {
    const initIife = `(${framework.init})(____evaluatedRuntime____, ____container____)`;

    evaluateWithContext(initIife, {
      ...scopeVariables,
      ____evaluatedRuntime____: evaluatedRuntime,
      ____container____: container,
    });
  };

  return initRuntime;

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
