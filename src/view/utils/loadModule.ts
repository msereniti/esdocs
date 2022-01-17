import { evaluateWithContext, EvaluationContext } from './evaluateWithContext';

export const loadModule = async <Module extends unknown>(
  url: string,
  {
    scopeImports = {},
    requirableModules = {},
  }: {
    scopeImports?: EvaluationContext;
    requirableModules?: EvaluationContext;
    cutIife?: boolean;
  }
) => {
  const module: { exports?: { default?: Module } } = {};

  const context = {
    ...scopeImports,
    require: (moduleName: string) => {
      if (requirableModules[moduleName]) {
        return requirableModules[moduleName];
      } else {
        const errorMessage =
          `Unable to provide module "${moduleName}" for ${url}, only [` +
          Object.keys(requirableModules).join(', ') +
          `] modules available to be required`;

        throw new Error(errorMessage);
      }
    },
    module,
  };

  const request = await fetch(url);
  const moduleCode = await request.text();

  try {
    return evaluateWithContext(moduleCode, context);
  } catch (error) {
    /** TBD: handle in better way */
    /* eslint-disable no-console */
    console.error(`Error occurred while evaluating module "${url}":`);
    console.error(error);
    console.log('The source module code is below:');
    console.log(moduleCode);
    /* eslint-enable no-console */
  }
};
