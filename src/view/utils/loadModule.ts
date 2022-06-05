import { evaluateWithContext, EvaluationContext, ExposedContextAccessor } from './evaluateWithContext';
import { loadJsonFile } from './loadJson';
import { loadTextFile } from './loadTextFile';
import { sourceMapsHandler } from './sourceMapsHandler';

export const loadModule = async <Module extends unknown>(
  url: string,
  {
    context = {},
    requirableModules = {},
    handleRuntimeVariables,
  }: {
    context?: EvaluationContext;
    requirableModules?: EvaluationContext;
    cutIife?: boolean;
    handleRuntimeVariables?: (exposedVariables: ExposedContextAccessor) => void;
  }
) => {
  const module: { exports?: { default?: Module } } = {};

  const fullContext = {
    ...context,
    require: (moduleName: string) => {
      if (requirableModules[moduleName]) {
        return requirableModules[moduleName];
      } else {
        const errorMessage = `Unable to provide module "${moduleName}" for ${url}, only [` + Object.keys(requirableModules).join(', ') + `] modules available to be required`;

        throw new Error(errorMessage);
      }
    },
    module,
  };

  const moduleCode = await loadTextFile(url);

  try {
    return evaluateWithContext(moduleCode, fullContext, handleRuntimeVariables);
  } catch (error) {
    /** TBD: handle in better way */
    /* eslint-disable no-console */
    console.error(`Error occurred while evaluating module "${url}":`);
    console.error(error);
    /* eslint-enable no-console */
  }
};
